const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { strict: "throw" },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("OtpLimit", schema, "otplimits");
