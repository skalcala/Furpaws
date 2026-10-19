const nodemailer = require("nodemailer");
const { fail } = require("./core");
const localHost = host => ["localhost", "127.0.0.1", "::1"].includes(host);
const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM &&
  (localHost(process.env.SMTP_HOST) || (process.env.SMTP_USER && process.env.SMTP_PASS)));
async function sendCode(email, code, purpose) {
  if (!configured()) fail(503, "Email verification is currently unavailable. Please contact the clinic.");
  const secure = process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465;
  const local = localHost(process.env.SMTP_HOST);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || (secure ? 465 : 587)), secure,
    requireTLS: !secure && !local, ignoreTLS: local,
    ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const action = purpose === "reset" ? "reset your password" : purpose === "email-change" ? "verify your new email address" : "verify your email address";
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM, to: email,
      subject: purpose === "reset" ? "FurPaws password reset code" : "FurPaws email verification code",
      text: `Your FurPaws code is: ${code}\n\nUse this code to ${action}. It expires in 10 minutes and can only be used once.\n\nDo not share this code. If you did not request it, you can ignore this email.`,
    });
  } catch {
    // Provider responses can contain credentials or recipient details; never forward them.
    fail(503, "The verification email could not be sent. Please try again later.");
  } finally { transport.close(); }
}
module.exports = { configured, sendCode };
