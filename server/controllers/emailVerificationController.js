const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User, EmailOtp, OtpLimit } = require("../models");
const mail = require("../utils/email");
const { fail, assertFields, transaction, audit } = require("../utils/core");
const { passwordValid } = require("../utils/password");
const LIFETIME = 10 * 60 * 1000;
const genericSent = "If this email is eligible, a verification code has been sent. Check your inbox and spam folder.";
const normalizeEmail = value => {
  if (typeof value !== "string" || value.trim().length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    fail(400, "Enter a valid email address.", { email: "Enter a valid email address." });
  return value.trim().toLowerCase();
};
const digest = value => crypto.createHmac("sha256", process.env.JWT_SECRET).update(value).digest("hex");
const codeHash = (id, email, purpose, code) => digest(`${id}:${email}:${purpose}:${code}`);
async function limit(value, action, maximum, seconds) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const key = digest(`email:${action}:${value}:${bucket}`);
  let counter;
  try {
    counter = await OtpLimit.findOneAndUpdate({ key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * seconds * 1000) } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    counter = await OtpLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { new: true });
  }
  if (counter.count > maximum) fail(429, "Too many email verification attempts. Please wait before trying again.");
}
// Use the socket address rather than accepting an arbitrary forwarded-IP header.
const remoteAddress = req => req.ip || req.socket?.remoteAddress || "unknown";
const publicPurpose = value => {
  if (!["register", "reset"].includes(value)) fail(400, "Choose a valid email verification action.");
  return value;
};
async function sendFor(req, res, purpose, signedInUser) {
  const email = normalizeEmail(req.body.email);
  if (!mail.configured()) fail(503, "Email verification is currently unavailable. Please contact the clinic.");
  await limit(remoteAddress(req), "send-ip", 20, 3600);
  await limit(email, "send-hour", 5, 3600);
  try {
    await OtpLimit.findOneAndUpdate({ key: digest(`email:cooldown:${email}`), expiresAt: { $lte: new Date() } }, { $set: { count: 1, expiresAt: new Date(Date.now() + 60000) } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code === 11000) fail(429, "Wait 60 seconds before requesting another email code.");
    throw error;
  }
  const existing = await User.findOne({ email, accountType: { $ne: "guest" } });
  if (purpose === "email-change" && existing && String(existing._id) !== String(signedInUser._id))
    fail(409, "This email address already belongs to an account.");
  // Keep password-reset responses identical for unknown and registered addresses.
  if (purpose === "register" && existing)
    fail(409, "This email already has a FurPaws account. Sign in or use Forgot Password.", { email: "This email is already registered." });
  if (purpose === "reset" && !existing)
    return res.json({ message: genericSent, challengeId: new mongoose.Types.ObjectId().toString(), retryAfter: 60 });
  const user = purpose === "reset" ? existing : signedInUser;
  const id = new mongoose.Types.ObjectId();
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await EmailOtp.updateMany({ email, purpose, consumedAt: null }, { $set: { consumedAt: new Date() } });
  await EmailOtp.create({ _id: id, email, purpose, user: user?._id || null, sessionVersion: user?.sessionVersion || 0, codeHash: codeHash(id, email, purpose, code), expiresAt: new Date(Date.now() + LIFETIME) });
  try {
    await mail.sendCode(email, code, purpose);
    await EmailOtp.updateOne({ _id: id, consumedAt: null }, { $set: { delivery: "sent" } });
  } catch (error) {
    await EmailOtp.updateOne({ _id: id }, { $set: { delivery: "failed", consumedAt: new Date() } });
    throw error;
  }
  res.json({ message: purpose === "reset" ? genericSent : "Verification code sent. Check your inbox and spam folder.", challengeId: String(id), retryAfter: 60 });
}
async function checkFor(req, res, purpose, user) {
  const email = normalizeEmail(req.body.email);
  const { challengeId, code } = req.body;
  if (!mongoose.isValidObjectId(challengeId) || typeof code !== "string" || !/^\d{6}$/.test(code)) fail(400, "Enter the 6-digit email verification code.");
  await limit(remoteAddress(req), "check-ip", 50, 600);
  await limit(email, "check-email", 15, 600);
  const filter = { _id: challengeId, email, purpose, ...(user ? { user: user._id } : {}), delivery: "sent", verifiedAt: null, consumedAt: null, expiresAt: { $gt: new Date() } };
  const challenge = await EmailOtp.findOneAndUpdate({ ...filter, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true }).select("+codeHash");
  const expected = codeHash(challengeId, email, purpose, code);
  if (!challenge || !crypto.timingSafeEqual(Buffer.from(challenge.codeHash, "hex"), Buffer.from(expected, "hex")))
    fail(400, "The code is invalid, expired, or has already been used. Request a new code if needed.");
  const verified = await EmailOtp.findOneAndUpdate({ ...filter, attempts: { $lte: 5 }, codeHash: expected }, { $set: { verifiedAt: new Date() } }, { new: true });
  if (!verified) fail(400, "The code is invalid, expired, or has already been used.");
  const expiresIn = Math.max(1, Math.floor((verified.expiresAt.valueOf() - Date.now()) / 1000));
  const ticket = jwt.sign({ purpose: "email-verification", action: purpose, challengeId, email, userId: verified.user ? String(verified.user) : null, version: verified.sessionVersion }, process.env.JWT_SECRET, { expiresIn });
  res.json({ ticket, expiresAt: verified.expiresAt, message: "Email verified." });
}
async function consumeTicket(ticket, purpose, email, user, session) {
  let payload;
  try { payload = jwt.verify(String(ticket || ""), process.env.JWT_SECRET); }
  catch { fail(400, "Verify your email before continuing.", { email: "Complete email verification or request a new code." }); }
  if (payload.purpose !== "email-verification" || payload.action !== purpose || payload.email !== email || payload.userId !== (user ? String(user._id) : null) || payload.version !== (user?.sessionVersion || 0))
    fail(400, "This verification does not match the email or action. Request a new code.", { email: "Verify this email address for this action." });
  const challenge = await EmailOtp.findOneAndUpdate({ _id: payload.challengeId, email, purpose, user: user?._id || null, sessionVersion: user?.sessionVersion || 0, delivery: "sent", verifiedAt: { $ne: null }, consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true, session });
  if (!challenge) fail(400, "This email verification has expired or was already used. Request a new code.", { email: "Request and verify a new code." });
}
const send = (req, res) => { assertFields(req.body, ["email", "purpose"]); return sendFor(req, res, publicPurpose(req.body.purpose)); };
const check = (req, res) => { assertFields(req.body, ["email", "purpose", "challengeId", "code"]); return checkFor(req, res, publicPurpose(req.body.purpose)); };
const sendChange = (req, res) => { assertFields(req.body, ["email"]); return sendFor(req, res, "email-change", req.user); };
const checkChange = (req, res) => { assertFields(req.body, ["email", "challengeId", "code"]); return checkFor(req, res, "email-change", req.user); };
async function resetPassword(req, res) {
  assertFields(req.body, ["email", "password", "emailVerificationTicket"]);
  const email = normalizeEmail(req.body.email);
  if (!passwordValid(req.body.password)) fail(400, "Use 8–72 characters with uppercase, lowercase, and a number.", { password: "Choose a stronger password." });
  try { await transaction(async session => {
    const user = await User.findOne({ email, accountType: { $ne: "guest" } }).session(session);
    if (!user) fail(400, "This reset request is invalid or has expired. Request a new code.");
    await consumeTicket(req.body.emailVerificationTicket, "reset", email, user, session);
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.emailVerified = true;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save({ session });
    await audit(user, "Reset password", "users", user._id, undefined, undefined, session);
  }); } catch (error) {
    if (error.status === 400) fail(400, "This reset request is invalid or has expired. Request a new code.");
    throw error;
  }
  res.json({ message: "Password reset. Sign in with your new password." });
}
module.exports = { send, check, sendChange, checkChange, resetPassword, consumeTicket, normalizeEmail };
