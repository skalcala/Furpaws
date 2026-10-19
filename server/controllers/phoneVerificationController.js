const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { fail, assertFields } = require("../utils/core");
const { normalizePhone } = require("../utils/phone");
const OtpLimit = require("../models/OtpLimit");
const configured = () =>
  !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
const configuration = (req, res) => res.json({ phoneOtpEnabled: configured(), emailOtpEnabled: require("../utils/email").configured() });
async function limit(phone, action, maximum, seconds) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = crypto
    .createHash("sha256")
    .update(`${action}:${phone}:${bucket}`)
    .digest("hex");
  let value;
  try {
    value = await OtpLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 2) * seconds * 1000) },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    value = await OtpLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { new: true },
    );
  }
  if (value.count > maximum)
    fail(429, "Too many verification attempts. Please try again later.");
}
async function provider(path, values) {
  if (!configured())
    fail(
      503,
      "SMS verification is currently unavailable. Please try again later.",
    );
  let response;
  try {
    response = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`,
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(values),
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    fail(
      503,
      "SMS verification is temporarily unavailable. Please try again later.",
    );
  }
  const data = await response.json();
  if (!response.ok)
    fail(
      response.status === 429 ? 429 : 400,
      response.status === 429
        ? "Too many verification attempts. Please wait before retrying."
        : "The verification could not be completed. Check the number/code or request a new code.",
    );
  return data;
}
async function send(req, res) {
  assertFields(req.body, ["phone"]);
  const phone = normalizePhone(req.body.phone);
  if (!configured())
    fail(
      503,
      "SMS verification is currently unavailable. Please try again later.",
    );
  await limit(phone, "send-hour", 5, 3600);
  await limit(phone, "send-minute", 1, 60);
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  await limit(ip, "ip-send", 15, 3600);
  await provider("Verifications", { To: phone, Channel: "sms" });
  res.json({ message: "Verification code sent.", retryAfter: 60 });
}
async function check(req, res) {
  assertFields(req.body, ["phone", "code"]);
  const phone = normalizePhone(req.body.phone);
  if (!/^\d{6}$/.test(req.body.code || ""))
    fail(400, "Enter the 6-digit verification code.");
  if (!configured())
    fail(
      503,
      "SMS verification is currently unavailable. Please try again later.",
    );
  await limit(phone, "check", 10, 600);
  const result = await provider("VerificationCheck", {
    To: phone,
    Code: req.body.code,
  });
  if (result.status !== "approved")
    fail(400, "The code is incorrect or expired. Request a new code.");
  const ticket = jwt.sign(
    { phone, type: "phone-verification" },
    process.env.JWT_SECRET,
    { expiresIn: "10m", audience: "furpaws-phone-verification" },
  );
  res.json({ ticket, phone });
}
function verifiedPhone(phone, ticket) {
  if (!ticket) return false;
  try {
    const value = jwt.verify(ticket, process.env.JWT_SECRET, {
      audience: "furpaws-phone-verification",
    });
    return (
      value.type === "phone-verification" &&
      value.phone === normalizePhone(phone)
    );
  } catch {
    return false;
  }
}
module.exports = { configuration, send, check, verifiedPhone, configured };
