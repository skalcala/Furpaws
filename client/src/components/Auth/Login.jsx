import { useState } from "react";
import { Alert, Button, Input, Form } from "antd";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { api, errorMessage } from "../../api";
import PhoneVerification from "./PhoneVerification";
import { useResource } from "../Shared/UI";
import { Logo } from "../Shared/Layout";
export default function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const register = searchParams.get("mode") === "register";
  const setRegister = (value) =>
    setSearchParams(value ? { mode: "register" } : {});
  const [form] = Form.useForm();
  const phone = Form.useWatch("phone", form);
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
          ...(ticket ? { phoneVerificationTicket: ticket } : {}),
        });
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
  return (
    <main
      className={`auth-page auth-reference${register ? " is-register" : ""}`}
    >
      <div className="auth-split-card">
        <section className="auth-form-side">
          <Link className="auth-back-link" to="/">
            ← Back to FurPaws
          </Link>
          <div className="auth-card">
            <Logo />
            <h1>
              {register ? "Create an owner account" : "Welcome to FurPaws"}
            </h1>
            <p>
              {register
                ? "A healthier journey starts with your account."
                : "Sign in to continue your pet’s care journey."}
            </p>
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
                        SMS verification is currently unavailable. You can
                        continue with email and password.
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
                    (configuration.data.phoneOtpEnabled && !ticket))
                }
              >
                {register ? "Create account" : "Sign in"}
              </Button>
            </Form>
            <Button
              type="link"
              onClick={() => {
                setRegister(!register);
                setError("");
                setSuccess("");
                setTicket("");
                form.resetFields();
              }}
            >
              {register
                ? "Already registered? Sign in"
                : "New pet owner? Create an account"}
            </Button>
            <NoteDemo />
          </div>
          <p className="auth-form-footnote">
            Your pets. Their health. One place.
          </p>
        </section>
        <figure className="auth-photo-side">
          <img
            src="/assets/auth/pug-portrait.avif"
            alt="Black pug wearing a striped shirt against a red background"
            fetchPriority="high"
          />
          <figcaption>
            Photo by{" "}
            <a
              href="https://unsplash.com/photos/black-pug-wearing-striped-apparel-DziZIYOGAHc"
              target="_blank"
              rel="noreferrer"
            >
              charlesdeluvio / Unsplash
            </a>
          </figcaption>
        </figure>
      </div>
    </main>
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
