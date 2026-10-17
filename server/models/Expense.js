const mongoose = require("mongoose");
const { text, number } = require("./schemaFields");

const ExpenseSchema = new mongoose.Schema(
  {
    category: text(true, 100),
    amount: number(true),
    date: { type: Date, required: true },
    notes: text(false, 500),
  },
  { timestamps: true, strict: "throw" },
);
const ExpenseModel = mongoose.model("Expense", ExpenseSchema, "expenses");
module.exports = ExpenseModel;
