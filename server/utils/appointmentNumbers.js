const mongoose = require("mongoose");
const Counter = require("../models/Counter");
async function nextAppointmentNumber(session) {
  const counter = await Counter.findOneAndUpdate(
    { _id: "appointments" }, { $inc: { value: 1 } },
    { new: true, upsert: true, session },
  );
  return counter.value;
}
// A one-time upgrade also catches records made by an older running application.
async function backfillAppointmentNumbers() {
  const Appointment = require("../models/Appointment");
  const highest = await Appointment.findOne({ appointmentNumber: { $gt: 0 } }).sort({ appointmentNumber: -1 }).lean();
  await Counter.updateOne({ _id: "appointments" }, { $max: { value: highest?.appointmentNumber || 0 } }, { upsert: true });
  const session = await mongoose.startSession();
  let assigned = 0;
  try {
    await session.withTransaction(async () => {
      assigned = 0;
      const records = await Appointment.find({ appointmentNumber: null }).sort({ createdAt: 1, _id: 1 }).select("_id").session(session);
      for (const record of records) {
        const appointmentNumber = await nextAppointmentNumber(session);
        await Appointment.updateOne({ _id: record._id, appointmentNumber: null }, { $set: { appointmentNumber } }, { session, timestamps: false });
        assigned++;
      }
    });
  } finally { await session.endSession(); }
  return assigned;
}
module.exports = { nextAppointmentNumber, backfillAppointmentNumbers };
