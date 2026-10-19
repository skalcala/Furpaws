import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input } from "antd";
import { api, errorMessage } from "../../api";
export default function EmailVerification({ email, purpose = "register", onVerified, disabled = false }) {
  const normalized = String(email || "").trim().toLowerCase();
  const [challenge, setChallenge] = useState(""), [code, setCode] = useState(""), [verified, setVerified] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [seconds, setSeconds] = useState(0), [error, setError] = useState(""), [expiresAt, setExpiresAt] = useState(null);
  const revision = useRef(0);
  useEffect(() => {
    revision.current += 1;
    setChallenge(""); setCode(""); setVerified(false); setBusy(false); setSeconds(0); setError(""); setExpiresAt(null); setNotice(""); onVerified("");
    return () => { revision.current += 1; };
  }, [normalized, purpose, onVerified]);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { setVerified(false); onVerified(""); setError("Email verification expired. Request and verify a new code."); }, Math.max(0, new Date(expiresAt).valueOf() - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, onVerified]);
  const change = purpose === "email-change";
  const endpoint = change ? "/users/me/email" : "/auth/email";
  const payload = { email: normalized, ...(!change ? { purpose } : {}) };
  const send = async () => {
    const current = revision.current; setBusy(true); setError("");
    try {
      const { data } = await api.post(`${endpoint}/send`, payload);
      if (current !== revision.current) return;
      setChallenge(data.challengeId); setNotice(data.message); setCode(""); setSeconds(data.retryAfter || 60); setExpiresAt(null);
    } catch (failure) { if (current === revision.current) setError(errorMessage(failure)); }
    finally { if (current === revision.current) setBusy(false); }
  };
  const verify = async () => {
    const current = revision.current; setBusy(true); setError("");
    try {
      const { data } = await api.post(`${endpoint}/check`, { ...payload, challengeId: challenge, code });
      if (current !== revision.current) return;
      setVerified(true); setExpiresAt(data.expiresAt); onVerified(data.ticket);
    } catch (failure) { if (current === revision.current) setError(errorMessage(failure)); }
    finally { if (current === revision.current) setBusy(false); }
  };
  return <div className="email-verification">
    {verified ? <Alert type="success" message="Email verified" /> : <>
      <Button onClick={send} loading={busy && !challenge} disabled={disabled || busy || seconds > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)}>
        {seconds ? `Resend email in ${seconds}s` : challenge ? "Resend email code" : "Send email code"}
      </Button>
      {challenge && <>
        <p className="muted">{notice} Codes expire in 10 minutes.</p>
        <div className="row">
          <Input aria-label="Email verification code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} value={code} placeholder="6-digit email code" onChange={event => setCode(event.target.value.replace(/\D/g, ""))} />
          <Button onClick={verify} loading={busy} disabled={disabled || busy || code.length !== 6}>Verify email</Button>
        </div>
      </>}
    </>}
    {error && <Alert type="error" showIcon message={error} />}
  </div>;
}
