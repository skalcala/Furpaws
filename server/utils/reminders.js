const { Appointment, Vaccination, Notification } = require("../models");
const { today } = require("./core");
// A cron request and an open inbox may generate the same reminder concurrently.
async function upsertReminder(filter, update, options) {
  try {
    return await Notification.updateOne(filter, update, options);
  } catch (error) {
    if (error.code !== 11000 || !error.keyPattern?.dedupeKey) throw error;
  }
}
async function generateReminders() {
  const now = new Date();
  const soon = new Date(now.valueOf() + 24 * 60 * 60 * 1000);
  const appointments = await Appointment.find({
    status: "Approved",
    date: {
      $gte: today(),
      $lte: soon.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
    },
  }).populate("pet");
  for (const appointment of appointments) {
    const start = new Date(`${appointment.date}T${appointment.time}:00+08:00`);
    if (start <= now || start > soon) continue;
    await upsertReminder(
      {
        dedupeKey: `appointment:${appointment._id}:${appointment.date}:${appointment.time}`,
      },
      {
        $setOnInsert: {
          owner: appointment.owner,
          pet: appointment.pet._id,
          appointment: appointment._id,
          title: "Reminder before upcoming appointment",
          message: `${appointment.pet.name}'s visit is ${appointment.date} at ${appointment.time}. Please arrive 10 minutes early.`,
          dueAt: start,
        },
      },
      { upsert: true },
    );
  }
  const due = await Vaccination.find({
    nextDueDate: { $gte: now, $lte: new Date(now.valueOf() + 7 * 86400000) },
  }).populate("pet");
  for (const vaccine of due)
    await upsertReminder(
      {
        dedupeKey: `vaccination:${vaccine._id}:${vaccine.nextDueDate.toISOString()}`,
      },
      {
        $setOnInsert: {
          owner: vaccine.owner,
          pet: vaccine.pet._id,
          title: "Vaccination due reminder",
          message: `${vaccine.pet.name} · ${vaccine.vaccine} · Due ${vaccine.nextDueDate.toISOString().slice(0, 10)}.`,
          dueAt: vaccine.nextDueDate,
        },
      },
      { upsert: true },
    );
}
module.exports = { generateReminders };
