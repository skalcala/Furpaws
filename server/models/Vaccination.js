const mongoose = require("mongoose");
const { ref } = require("./schemaFields");

const VaccinationSchema = new mongoose.Schema(
  {
    pet: ref("Pet"),
    owner: ref("User"),
    consultation: ref("Consultation"),
    vaccine: {
      type: String,
      enum: ["Rabies", "DHPP", "FVRCP"],
      required: true,
    },
    dateGiven: { type: Date, required: true },
    nextDueDate: { type: Date, required: true },
  },
  { timestamps: true, strict: "throw" },
);
const VaccinationModel = mongoose.model(
  "Vaccination",
  VaccinationSchema,
  "vaccinations",
);
module.exports = VaccinationModel;
