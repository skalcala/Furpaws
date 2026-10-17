const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { normalizePhone, phoneVariants } = require("../utils/phone");
const verification = require("./phoneVerificationController");
const {
  fail,
  pick,
  audit,
  transaction,
  assertFields,
} = require("../utils/core");
const passwordValid = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  password.length <= 72 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.accountType === "guest" ? "" : user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
  phoneVerified: !!user.phoneVerified,
  accountType: user.accountType || "registered",
});
const login = async (req, res) => {
  assertFields(req.body, ["email", "identifier", "password"]);
  const { password } = req.body;
  const identifier = String(req.body.identifier || req.body.email || "").trim();
  const query = identifier.includes("@")
    ? { email: identifier.toLowerCase() }
    : { phone: { $in: phoneVariants(identifier) } };
  const candidates = await User.find({
    ...query,
    accountType: { $ne: "guest" },
  }).select("+passwordHash");
  if (candidates.length > 1)
    fail(
      400,
      "This mobile number is shared by multiple accounts. Use your email to sign in.",
    );
  const user = candidates[0];
  if (
    !user ||
    typeof password !== "string" ||
    !(await bcrypt.compare(password, user.passwordHash))
  )
    fail(401, "Email or password is incorrect.");
  res.json({
    user: safeUser(user),
    token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "8h",
    }),
  });
};
const createUser = async (req, res) => {
  assertFields(req.body, [
    "name",
    "email",
    "phone",
    "address",
    "password",
    "phoneVerificationTicket",
  ]);
  const { password, phoneVerificationTicket } = req.body;
  const normalized = normalizePhone(req.body.phone);
  const verified = verification.verifiedPhone(
    normalized,
    phoneVerificationTicket,
  );
  if (verification.configured() && !verified)
    fail(400, "Verify your mobile number before creating an account.", {
      phone: "Complete SMS verification.",
    });
  if (!passwordValid(password))
    fail(400, "Please check your password.", {
      password: "Use 8–72 characters with uppercase, lowercase, and a number.",
    });
  if (
    await User.exists({
      accountType: { $ne: "guest" },
      phone: { $in: phoneVariants(normalized) },
    })
  )
    fail(
      409,
      "This mobile number already has an account. Sign in or contact the clinic.",
    );
  const user = await User.create({
    ...pick(req.body, ["name", "email", "phone", "address"]),
    phone: normalized,
    phoneNormalized: normalized,
    phoneVerified: verified,
    passwordHash: await bcrypt.hash(password, 12),
    role: "OWNER",
  });
  res.status(201).json(safeUser(user));
};
const getUsers = async (req, res) =>
  res.json((await User.find({ role: "OWNER" })).map(safeUser));
const getMe = async (req, res) => res.json(safeUser(req.user));
const updateUser = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, [
        "name",
        "email",
        "phone",
        "address",
        "phoneVerificationTicket",
      ]);
      const before = req.user.toObject();
      if (
        req.body.phone &&
        normalizePhone(req.body.phone) !== normalizePhone(req.user.phone)
      ) {
        const verified = verification.verifiedPhone(
          req.body.phone,
          req.body.phoneVerificationTicket,
        );
        if (verification.configured() && !verified)
          fail(400, "Verify the new mobile number before saving.", {
            phone: "Complete SMS verification.",
          });
        const normalized = normalizePhone(req.body.phone);
        if (
          await User.exists({
            _id: { $ne: req.user._id },
            accountType: { $ne: "guest" },
            phone: { $in: phoneVariants(normalized) },
          }).session(session)
        )
          fail(409, "This mobile number already belongs to an account.");
        req.user.phoneNormalized = normalized;
        req.user.phoneVerified = verified;
      }
      if (
        req.body.phoneVerificationTicket &&
        verification.verifiedPhone(
          req.body.phone || req.user.phone,
          req.body.phoneVerificationTicket,
        )
      )
        req.user.phoneVerified = true;
      Object.assign(
        req.user,
        pick(req.body, ["name", "email", "phone", "address"]),
      );
      await req.user.save({ session });
      await audit(
        req.user,
        "Edit",
        "users",
        req.user._id,
        before,
        safeUser(req.user),
        session,
      );
      return safeUser(req.user);
    }),
  );
const changePassword = async (req, res) => {
  assertFields(req.body, ["currentPassword", "password"]);
  const { currentPassword, password } = req.body;
  const user = await User.findById(req.user._id).select("+passwordHash");
  if (!(await bcrypt.compare(String(currentPassword || ""), user.passwordHash)))
    fail(400, "Current password is incorrect.", {
      currentPassword: "Current password is incorrect.",
    });
  if (!passwordValid(password))
    fail(400, "Please check your password.", {
      password: "Use 8–72 characters with uppercase, lowercase, and a number.",
    });
  await transaction(async (session) => {
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save({ session });
    await audit(
      user,
      "Edit password",
      "users",
      user._id,
      undefined,
      undefined,
      session,
    );
  });
  res.json({ message: "Password changed." });
};
module.exports = {
  login,
  createUser,
  getUsers,
  getMe,
  updateUser,
  changePassword,
};
