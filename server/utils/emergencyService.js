const { Service } = require("../models");
async function emergencyService(session) {
  const existing = await Service.findOne({ key: "emergency" }).session(session || null);
  if (existing) return existing;
  const general = await Service.findOne({ type: "Consultation", active: true, name: { $not: /follow[ -]?up/i } }).session(session || null);
  if (!general) { const error = new Error("Configure an active consultation service before the first emergency visit."); error.status = 409; throw error; }
  return Service.findOneAndUpdate({ key: "emergency" }, { $setOnInsert: {
    name: "Emergency", type: "Emergency", description: "Urgent veterinary assessment and treatment.",
    fee: general?.fee || 0, active: true,
  } }, { new: true, upsert: true, session });
}
module.exports = { emergencyService };
