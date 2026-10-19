const mongoose = require("mongoose");
const { text } = require("./schemaFields");

const UserSchema = new mongoose.Schema(
  {
    name: { ...text(true, 80), minlength: 2 },
    email: {
      ...text(true),
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      ...text(false),
      required: function () {
        return this.accountType !== "guest";
      },
      match: /^(09\d{9}|\+639\d{9})$/,
    },
    address: text(false, 300),
    profilePicture: text(false, 400000),
    passwordHash: {
      type: String,
      required: function () {
        return this.accountType !== "guest";
      },
      select: false,
    },
    phoneNormalized: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    phoneVerified: { type: Boolean, default: false },
    accountType: {
      type: String,
      enum: ["registered", "guest"],
      default: "registered",
    },
    role: { type: String, enum: ["OWNER", "ADMIN"], default: "OWNER" },
  },
  { timestamps: true, strict: "throw" },
);
const UserModel = mongoose.model("User", UserSchema, "users");
module.exports = UserModel;
