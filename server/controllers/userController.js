const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { fail, pick, audit, transaction } = require("../utils/core");
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
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
});
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({
    email: String(email).toLowerCase().trim(),
  }).select("+passwordHash");
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
  const { password } = req.body;
  if (!passwordValid(password))
    fail(400, "Please check your password.", {
      password: "Use 8–72 characters with uppercase, lowercase, and a number.",
    });
  const user = await User.create({
    ...pick(req.body, ["name", "email", "phone", "address"]),
    passwordHash: await bcrypt.hash(password, 12),
    role: "OWNER",
  });
  res.status(201).json(safeUser(user));
};
const getUsers = async (req, res) =>
  res.json(await User.find({ role: "OWNER" }));
const getMe = async (req, res) => res.json(safeUser(req.user));
const updateUser = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      const before = req.user.toObject();
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
