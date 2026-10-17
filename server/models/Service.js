const mongoose = require("mongoose");
const { text, number } = require("./schemaFields");

const ServiceSchema = new mongoose.Schema(
  {
    name: text(true, 100),
    description: text(true, 500),
    fee: number(true),
    type: {
      type: String,
      enum: ["Consultation", "Vaccination"],
      default: "Consultation",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, strict: "throw" },
);
const ServiceModel = mongoose.model("Service", ServiceSchema, "services");
module.exports = ServiceModel;
