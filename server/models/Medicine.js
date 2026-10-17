const mongoose = require("mongoose");
const { text, number } = require("./schemaFields");

const MedicineSchema = new mongoose.Schema(
  {
    name: text(true, 100),
    quantity: { ...number(true), validate: Number.isInteger },
    unit: text(true, 30),
    price: number(true),
    expiryDate: { type: Date, required: true },
    lowStockThreshold: { ...number(), default: 10 },
  },
  { timestamps: true, strict: "throw" },
);
const MedicineModel = mongoose.model("Medicine", MedicineSchema, "medicines");
module.exports = MedicineModel;
