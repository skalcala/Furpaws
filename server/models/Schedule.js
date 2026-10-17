const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    key: { type: String, default: "clinic", unique: true },
    capacity: { type: Number, min: 1, max: 100, default: 3 },
    dailyCapacity: { type: Number, min: 1, max: 1000, default: 18 },
    times: { type: [String], default: ["09:00", "10:30", "11:30", "14:00"] },
    blockedDates: { type: [String], default: [] },
    holidays: { type: [String], default: [] },
    leaveDates: { type: [String], default: [] },
    hours: {
      type: [{ day: Number, open: String, close: String, closed: Boolean }],
      default: () =>
        Array.from({ length: 7 }, (_, day) => ({
          day,
          open: "08:00",
          close: day === 6 ? "12:00" : "17:00",
          closed: day === 0,
        })),
    },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true, strict: "throw" },
);
const ScheduleModel = mongoose.model("Schedule", ScheduleSchema, "schedules");
module.exports = ScheduleModel;
