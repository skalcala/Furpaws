const mongoose = require("mongoose");
const { ref, text } = require("./schemaFields");

const AppointmentSchema = new mongoose.Schema(
  {
    owner: ref("User"),
    pet: ref("Pet"),
    service: ref("Service"),
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true },
    bookingType: {
      type: String,
      enum: ["With record", "No record"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Declined", "Completed", "Cancelled"],
      default: "Pending",
    },
    source: { type: String, enum: ["Owner", "Emergency", "Clinic"], default: "Owner" },
    emergencyRequestKey: { type: String, unique: true, sparse: true },
    reasonForVisit: { ...text(false, 2000), default: "" },
    declineReason: text(false, 500),
    cancellationReason: text(false, 500),
    cancelledBy: ref("User", false),
    cancelledAt: Date,
    admin: ref("User", false),
  },
  { timestamps: true, strict: "throw" },
);
const AppointmentModel = mongoose.model(
  "Appointment",
  AppointmentSchema,
  "appointments",
);
module.exports = AppointmentModel;
