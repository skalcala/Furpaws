import { useState } from "react";
import { Alert, Button, Input, Form } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api, errorMessage } from "../../api";
import PhoneVerification from "./PhoneVerification";
import { useResource } from "../Shared/UI";
import AuthShell from "./AuthShell";
import EmailVerification from "./EmailVerification";
import ForgotPassword from "./ForgotPassword";
export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const register = searchParams.get("mode") === "register";
  const setRegister = (value) =>
    setSearchParams(value ? { mode: "register" } : {});
  const [form] = Form.useForm();
  const phone = Form.useWatch("phone", form);
  const email = Form.useWatch("email", form);
  const [emailTicket, setEmailTicket] = useState("");
  const configuration = useResource("/auth/config");
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const submit = async (values) => {
    setBusy(true);
    setError("");
    try {
      if (register) {
        await api.post("/auth/register", {
          ...values,
          emailVerificationTicket: emailTicket,
          ...(ticket ? { phoneVerificationTicket: ticket } : {}),
        });
        form.resetFields(); setEmailTicket(""); setTicket("");
        setRegister(false);
        setSuccess("Account created. Sign in to book your first appointment.");
      } else {
        const user = await login(values);
        navigate(user.role === "ADMIN" ? "/admin/dashboard" : "/owner/dashboard");
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  if (searchParams.get("mode") === "forgot") return <ForgotPassword onBack={() => { setSearchParams({}); setError(""); setSuccess(""); form.resetFields(); }} />;
  return (
    <AuthShell register={register} title={register ? "Create an owner account" : "Welcome to FurPaws"} description={register ? "A healthier journey starts with your account." : "Sign in to continue your pet’s care journey."}>
            {error && <Alert type="error" showIcon message={error} />}{" "}
            {success && <Alert type="success" message={success} />}
            <Form
              key={register ? "register" : "login"}
              form={form}
              layout="vertical"
              onFinish={submit}
              requiredMark={false}
              onValuesChange={(changed) => {
                if (changed.phone) setTicket("");
              }}
            >
              {register && (
                <>
                  <Form.Item
                    label="Full name"
                    name="name"
                    rules={[
                      {
                        required: true,
                        min: 2,
                        max: 80,
                        message: "Enter your full name (2–80 characters).",
                      },
                    ]}
                  >
                    <Input autoComplete="name" />
                  </Form.Item>
                  <Form.Item
                    label="PH mobile number"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        pattern: /^(09\d{9}|\+639\d{9})$/,
                        message: "Use 09XXXXXXXXX or +639XXXXXXXXX.",
                      },
                    ]}
                  >
                    <Input autoComplete="tel" inputMode="tel" />
                  </Form.Item>
                  {configuration.data.phoneOtpEnabled ? (
                    <PhoneVerification phone={phone} onVerified={setTicket} />
                  ) : (
                    !configuration.loading && (
                      <p className="muted">
                        SMS verification is currently unavailable.
                      </p>
                    )
                  )}
                </>
              )}
              <Form.Item
                label={register ? "Email" : "Email or mobile number"}
                name={register ? "email" : "identifier"}
                rules={[
                  {
                    required: true,
                    ...(register ? { type: "email" } : {}),
                    message: register
                      ? "Enter a valid email address."
                      : "Enter your email or PH mobile number.",
                  },
                ]}
              >
                <Input
                  autoComplete={register ? "email" : "username"}
                  placeholder={
                    register ? "you@example.com" : "Email or Phone number"
                  }
                />
              </Form.Item>
              {register && <>
                <EmailVerification email={email} onVerified={setEmailTicket} disabled={!configuration.data.emailOtpEnabled} />
                {!configuration.loading && !configuration.data.emailOtpEnabled && <Alert type="warning" message="Email verification is currently unavailable. Please contact the clinic." />}
              </>}
              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: "Enter your password." },
                  ...(register
                    ? [
                        {
                          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/,
                          message:
                            "Use 8–72 characters, uppercase, lowercase, and a number.",
                        },
                      ]
                    : []),
                ]}
              >
                <Input.Password
                  autoComplete={register ? "new-password" : "current-password"}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={busy}
                disabled={
                  register &&
                  (configuration.loading ||
                    !configuration.data.emailOtpEnabled || !emailTicket ||
                    (configuration.data.phoneOtpEnabled && !ticket))
                }
              >
                {register ? "Create account" : "Sign in"}
              </Button>
            </Form>
            {!register && <Button type="link" onClick={() => { setSearchParams({ mode: "forgot" }); setError(""); setSuccess(""); }}>Forgot password?</Button>}
            <Button
              type="link"
              onClick={() => {
                setRegister(!register);
                setError("");
                setSuccess("");
                setTicket("");
                setEmailTicket("");
                form.resetFields();
              }}
            >
              {register
                ? "Already registered? Sign in"
                : "New pet owner? Create an account"}
            </Button>
            <NoteDemo />
    </AuthShell>
  );
}
function NoteDemo() {
  return (
    <details className="demo-credentials">
      <summary>Local classroom demo accounts</summary>
      <p>
        Owner: ava@furpaws.test
        <br />
        Admin: admin@furpaws.test
        <br />
        Password: FurPaws123
      </p>
    </details>
  );
}
