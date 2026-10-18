const mongoose = require("mongoose");
const { ref, text, number } = require("./schemaFields");

const PetSchema = new mongoose.Schema(
  {
    owner: ref("User"),
    name: text(true, 80),
    species: { type: String, enum: ["Dog", "Cat", "Other"], required: true },
    otherSpecies: text(false, 80),
    gender: { type: String, enum: ["Male", "Female", "Unknown"], default: "Unknown" },
    breed: text(true, 80),
    birthDate: {
      type: Date,
      required: function () {
        return !this.emergencyRegistration;
      },
    },
    emergencyRegistration: { type: Boolean, default: false },
    weight: number(false, 500),
    estimatedWeight: number(false, 500),
    picture: text(false, 3000000),
    status: {
      type: String,
      enum: ["Pending", "Approved", "Declined"],
      default: "Pending",
    },
    declineReason: text(false, 500),
    weightHistory: [{ date: Date, weight: Number }],
  },
  { timestamps: true, strict: "throw" },
);
const PetModel = mongoose.model("Pet", PetSchema, "pets");
module.exports = PetModel;
