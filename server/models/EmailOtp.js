const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ["register", "reset", "email-change"], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  sessionVersion: { type: Number, default: 0 },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  delivery: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
  verifiedAt: { type: Date, default: null },
  consumedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, strict: "throw" });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ email: 1, purpose: 1 });
module.exports = mongoose.model("EmailOtp", schema, "emailotps");
