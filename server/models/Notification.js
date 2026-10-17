const mongoose = require("mongoose");
const { ref, text } = require("./schemaFields");

const NotificationSchema = new mongoose.Schema(
  {
    owner: ref("User"),
    pet: ref("Pet", false),
    appointment: ref("Appointment", false),
    title: text(true),
    message: text(true, 2000),
    dueAt: Date,
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true, strict: "throw" },
);
const NotificationModel = mongoose.model(
  "Notification",
  NotificationSchema,
  "notifications",
);
module.exports = NotificationModel;
