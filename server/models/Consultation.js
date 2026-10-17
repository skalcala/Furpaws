const mongoose = require("mongoose");
const { ref, text, number } = require("./schemaFields");

const ConsultationSchema = new mongoose.Schema(
  {
    appointment: { ...ref("Appointment"), unique: true },
    pet: ref("Pet"),
    owner: ref("User"),
    admin: ref("User"),
    weight: number(true, 500),
    diagnosis: text(false, 2000),
    treatment: text(false, 2000),
    notes: text(false, 2000),
    followUp: {
      enabled: { type: Boolean, default: false },
      date: String,
      purpose: text(false, 2000),
      instructions: text(false, 2000),
    },
    // Historical records remain intact; new prescription creation is retired.
    prescriptions: [
      {
        medicine: ref("Medicine"),
        name: String,
        quantity: { type: Number, min: 1 },
        price: Number,
        dosage: String,
        frequency: String,
        duration: String,
      },
    ],
  },
  { timestamps: true, strict: "throw" },
);
const ConsultationModel = mongoose.model(
  "Consultation",
  ConsultationSchema,
  "consultations",
);
module.exports = ConsultationModel;
