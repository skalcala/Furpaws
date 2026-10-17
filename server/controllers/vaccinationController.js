const { Vaccination } = require("../models");
const {
  fail,
  pick,
  getDoc,
  audit,
  transaction,
  today,
  assertFields,
} = require("../utils/core");
const getVaccinations = require("./resourceController").getVaccinations;
const updateVaccination = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["vaccine", "dateGiven", "nextDueDate"]);
      const record = await getDoc(Vaccination, req.params.id, session);
      const before = record.toObject();
      Object.assign(
        record,
        pick(req.body, ["vaccine", "dateGiven", "nextDueDate"]),
      );
      if (
        Number.isNaN(new Date(record.dateGiven).valueOf()) ||
        Number.isNaN(new Date(record.nextDueDate).valueOf()) ||
        new Date(record.nextDueDate) <= new Date(record.dateGiven) ||
        new Date(record.dateGiven).toISOString().slice(0, 10) > today()
      )
        fail(400, "Use a valid date given and a later next due date.", {
          nextDueDate: "Next due date must follow date given.",
        });
      await record.save({ session });
      await audit(
        req.user,
        "Edit",
        "vaccinations",
        record._id,
        before,
        record.toObject(),
        session,
      );
      return record;
    }),
  );
module.exports = { getVaccinations, updateVaccination };
