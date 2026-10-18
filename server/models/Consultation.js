const mongoose = require("mongoose");
const { ref, text, number } = require("./schemaFields");

const PROCEDURES = [
  "N/A",
  "Physical examination",
  "Wound cleaning / dressing",
  "Injection / IV fluids",
  "Deworming",
  "Laboratory test",
  "X-ray / ultrasound",
  "Minor surgery",
  "Other",
];

const ConsultationSchema = new mongoose.Schema(
  {
    appointment: { ...ref("Appointment"), unique: true },
    pet: ref("Pet"),
    owner: ref("User"),
    admin: ref("User"),
    weight: number(true, 500),
    symptoms: text(false, 2000),
    diagnosis: text(false, 2000),
    prescription: text(false, 2000),
    // Legacy field kept so earlier records still display; new visits use `prescription`.
    treatment: text(false, 2000),
    // What was done to the pet (dropdown); "N/A" when nothing else was done.
    procedure: { type: String, enum: PROCEDURES, default: "N/A" },
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
module.exports.PROCEDURES = PROCEDURES;
