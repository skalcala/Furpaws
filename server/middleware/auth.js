const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { fail } = require("../utils/core");
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) fail(401, "Please sign in to continue.");
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      fail(401, "Your session expired. Please sign in again.");
    }
    req.user = await User.findById(payload.id);
    if (!req.user || req.user.accountType === "guest") fail(401, "Account not found. Please sign in again.");
    next();
  } catch (error) {
    next(error);
  }
};
const role =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(
          Object.assign(new Error("You do not have access to this page."), {
            status: 403,
          }),
        );
module.exports = { auth, role };
