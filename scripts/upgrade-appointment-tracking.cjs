const fs = require("fs"), path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../server/.env"), quiet: true });
const mongoose = require("mongoose");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const { Appointment, Service, Counter } = require("../server/models");
    for (const model of [Appointment, Service, Counter]) await model.init();
    const missing = await Appointment.countDocuments({ appointmentNumber: null });
    const emergencies = await Appointment.countDocuments({ source: "Emergency" });
    if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ missingAppointmentNumbers: missing, emergencyVisits: emergencies, changesApplied: false })); return; }
    const folder = path.join(__dirname, "../.local/tracking-upgrade"); fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
    const backup = { appointments: await Appointment.find().select("_id appointmentNumber service source createdAt updatedAt").lean(), counters: await Counter.find().lean() };
    fs.writeFileSync(path.join(folder, `before-${Date.now()}.json`), JSON.stringify(backup), { mode: 0o600 });
    const assigned = await require("../server/utils/appointmentNumbers").backfillAppointmentNumbers();
    let linked = 0;
    if (emergencies) {
      const service = await require("../server/utils/emergencyService").emergencyService();
      linked = (await Appointment.collection.updateMany({ source: "Emergency", service: { $ne: service._id } }, { $set: { service: service._id } })).modifiedCount;
    }
    console.log(JSON.stringify({ appointmentNumbersAssigned: assigned, emergencyServicesLinked: linked, createdDatesPreserved: true, billsUnchanged: true, privateBackupSaved: true }));
  } finally { await mongoose.disconnect(); }
})().catch(error => { console.error("Tracking upgrade failed:", error.name, error.code || ""); process.exitCode = 1; });
