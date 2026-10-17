const mongoose = require("mongoose");
const { ref, text, number } = require("./schemaFields");

const PetSchema = new mongoose.Schema(
  {
    owner: ref("User"),
    name: text(true, 80),
    species: { type: String, enum: ["Dog", "Cat", "Other"], required: true },
    breed: text(true, 80),
    birthDate: { type: Date, required: true },
    weight: number(true, 500),
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
