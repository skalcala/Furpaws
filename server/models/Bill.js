const mongoose = require("mongoose");
const { ref, number } = require("./schemaFields");

const BillSchema = new mongoose.Schema(
  {
    appointment: { ...ref("Appointment"), unique: true },
    consultation: ref("Consultation"),
    owner: ref("User"),
    pet: ref("Pet"),
    items: [
      { name: String, quantity: Number, unitPrice: Number, amount: Number },
    ],
    total: number(true),
    status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
    paymentMethod: {
      type: String,
      enum: ["Cash", "GCash", "Card", "Bank transfer", ""],
      default: "",
    },
    paidAt: Date,
  },
  { timestamps: true, strict: "throw" },
);
const BillModel = mongoose.model("Bill", BillSchema, "bills");
module.exports = BillModel;
