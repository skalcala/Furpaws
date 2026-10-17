import { useEffect, useState } from "react";
import { Alert, Button, Input } from "antd";
import { api, errorMessage } from "../../api";
export default function PhoneVerification({ phone, onVerified }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSent(false);
    setCode("");
    setVerified(false);
    setError("");
    setSeconds(0);
  }, [phone]);
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/phone/send", { phone });
      setSent(true);
      setSeconds(60);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/phone/check", { phone, code });
      onVerified(data.ticket);
      setVerified(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="phone-verification">
      {verified ? (
        <Alert type="success" message="Mobile number verified" />
      ) : (
        <>
          <Button
            onClick={send}
            disabled={
              busy || seconds > 0 || !/^(09\d{9}|\+639\d{9})$/.test(phone || "")
            }
            loading={busy && !sent}
          >
            {seconds
              ? `Resend in ${seconds}s`
              : sent
                ? "Resend verification code"
                : "Send verification code"}
          </Button>
          {sent && (
            <div className="row">
              <Input
                aria-label="SMS verification code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                placeholder="6-digit SMS code"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                onClick={verify}
                disabled={busy || code.length !== 6}
                loading={busy}
              >
                Verify number
              </Button>
            </div>
          )}
        </>
      )}
      {error && <Alert type="error" message={error} />}
    </div>
  );
}
