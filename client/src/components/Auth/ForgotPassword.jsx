import { useState } from "react";
import { Alert, Button, Form, Input } from "antd";
import { api, errorMessage } from "../../api";
import { useResource } from "../Shared/UI";
import AuthShell from "./AuthShell";
import EmailVerification from "./EmailVerification";
export default function ForgotPassword({ onBack }) {
  const [form] = Form.useForm(), email = Form.useWatch("email", form);
  const [ticket, setTicket] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  const configuration = useResource("/auth/config");
  const submit = async values => {
    setBusy(true); setError("");
    try {
      await api.post("/auth/password/reset", { email: values.email, password: values.password, emailVerificationTicket: ticket });
      setDone(true); setTicket(""); form.resetFields();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <AuthShell title="Forgot your password?" description="Verify your email, then choose a new password for your FurPaws account.">
    {done ? <><Alert type="success" message="Password reset" description="Sign in with your new password. Your previous sessions have been signed out." /><Button type="primary" block onClick={onBack}>Back to sign in</Button></> : <>
      {error && <Alert type="error" showIcon message={error} />}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email", message: "Enter your account email address." }]}><Input autoComplete="email" placeholder="you@example.com" /></Form.Item>
        <EmailVerification email={email} purpose="reset" onVerified={setTicket} disabled={!configuration.data.emailOtpEnabled} />
        {!configuration.loading && !configuration.data.emailOtpEnabled && <Alert type="warning" message="Email verification is currently unavailable. Please contact the clinic." />}
        {ticket && <>
          <Form.Item label="New password" name="password" rules={[{ required: true, pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, message: "Use 8–72 characters, uppercase, lowercase, and a number." }]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Form.Item label="Confirm new password" name="confirmPassword" dependencies={["password"]} rules={[{ required: true, message: "Confirm your new password." }, ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue("password") ? Promise.resolve() : Promise.reject(new Error("Passwords do not match.")) })]}><Input.Password autoComplete="new-password" /></Form.Item>
          <Button htmlType="submit" type="primary" block loading={busy}>Reset password</Button>
        </>}
      </Form>
      <Button type="link" onClick={onBack}>Back to sign in</Button>
    </>}
  </AuthShell>;
}
