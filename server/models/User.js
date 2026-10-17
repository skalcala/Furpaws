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
    phone: { ...text(true), match: /^(09\d{9}|\+639\d{9})$/ },
    address: text(false, 300),
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["OWNER", "ADMIN"], default: "OWNER" },
  },
  { timestamps: true, strict: "throw" },
);
const UserModel = mongoose.model("User", UserSchema, "users");
module.exports = UserModel;
