const {
  Appointment,
  Consultation,
  Pet,
  Medicine,
  Service,
  Bill,
  Vaccination,
} = require("../models");
const {
  fail,
  pick,
  audit,
  notify,
  transaction,
  getDoc,
  today,
} = require("../utils/core");
const getConsultations = async (req, res) =>
  res.json(
    await Consultation.find()
      .populate("pet")
      .populate("admin", "name")
      .sort({ createdAt: -1 }),
  );
const completeConsultation = async (req, res) =>
  res.status(201).json(
    await transaction(async (session) => {
      const {
        appointment: appointmentId,
        weight,
        diagnosis,
        treatment,
        notes,
        prescriptions = [],
        vaccination,
      } = req.body;
      const appointment = await getDoc(Appointment, appointmentId, session);
      if (appointment.status !== "Approved")
        fail(409, "Consultations require an Approved appointment.");
      const service = await getDoc(Service, appointment.service, session);
      const vaccineService = service.type === "Vaccination";
      if (
        !Number.isFinite(Number(weight)) ||
        Number(weight) <= 0 ||
        Number(weight) > 500
      )
        fail(400, "Enter a weight between 0 and 500 kg.", {
          weight: "Weight must be greater than 0 and at most 500 kg.",
        });
      if (!vaccineService && (!diagnosis?.trim() || !treatment?.trim()))
        fail(400, "Diagnosis and treatment are required.", {
          diagnosis: !diagnosis?.trim() ? "Diagnosis is required." : undefined,
          treatment: !treatment?.trim() ? "Treatment is required." : undefined,
        });
      if (!Array.isArray(prescriptions) || prescriptions.length > 30)
        fail(400, "Invalid prescription list.");
      if (vaccineService && prescriptions.length)
        fail(400, "Prescriptions do not apply to a vaccination service.");
      if (vaccineService && !vaccination)
        fail(400, "Vaccination details are required.");
      if (
        vaccination &&
        (!["Rabies", "DHPP", "FVRCP"].includes(vaccination.vaccine) ||
          !vaccination.dateGiven ||
          !vaccination.nextDueDate ||
          Number.isNaN(Date.parse(vaccination.dateGiven)) ||
          Number.isNaN(Date.parse(vaccination.nextDueDate)) ||
          vaccination.dateGiven > today() ||
          vaccination.nextDueDate <= vaccination.dateGiven)
      )
        fail(
          400,
          "Use a valid vaccine, a date given no later than today, and a later due date.",
          { nextDueDate: "Next due date must be after date given." },
        );
      const savedPrescriptions = [];
      for (const {
        medicine: medicineId,
        quantity,
        dosage,
        frequency,
        duration,
      } of prescriptions) {
        if (
          !Number.isInteger(Number(quantity)) ||
          Number(quantity) <= 0 ||
          !dosage?.trim() ||
          !frequency?.trim() ||
          !duration?.trim() ||
          [dosage, frequency, duration].some((value) => value.length > 100)
        )
          fail(
            400,
            "Complete prescription quantity, dosage, frequency, and duration.",
          );
        const medicine = await getDoc(Medicine, medicineId, session);
        if (medicine.expiryDate < new Date(`${today()}T00:00:00+08:00`))
          fail(409, "Medicine expired. Select another medicine.", {
            medicine: "Medicine expired.",
          });
        if (medicine.quantity < Number(quantity))
          fail(409, "Medicine out of stock or insufficient quantity.", {
            medicine: "Medicine out of stock or insufficient quantity.",
          });
        const before = medicine.quantity;
        medicine.quantity -= Number(quantity);
        await medicine.save({ session });
        await audit(
          req.user,
          "Stock change",
          "medicines",
          medicine._id,
          { quantity: before },
          { quantity: medicine.quantity },
          session,
        );
        savedPrescriptions.push({
          medicine: medicine._id,
          name: medicine.name,
          price: medicine.price,
          quantity: Number(quantity),
          dosage,
          frequency,
          duration,
        });
      }
      const [consultation] = await Consultation.create(
        [
          {
            appointment: appointment._id,
            pet: appointment.pet,
            owner: appointment.owner,
            admin: req.user._id,
            weight,
            diagnosis,
            treatment,
            notes,
            prescriptions: savedPrescriptions,
          },
        ],
        { session },
      );
      const pet = await getDoc(Pet, appointment.pet, session);
      const oldWeight = pet.weight;
      pet.weight = Number(weight);
      pet.status = "Approved";
      pet.weightHistory.push({ date: new Date(), weight: Number(weight) });
      await pet.save({ session });
      appointment.status = "Completed";
      appointment.admin = req.user._id;
      await appointment.save({ session });
      if (vaccination)
        await Vaccination.create(
          [
            {
              ...pick(vaccination, ["vaccine", "dateGiven", "nextDueDate"]),
              pet: pet._id,
              owner: appointment.owner,
              consultation: consultation._id,
            },
          ],
          { session },
        );
      const items = [
        {
          name: service.name,
          quantity: 1,
          unitPrice: service.fee,
          amount: service.fee,
        },
        ...savedPrescriptions.map(({ name, quantity, price }) => ({
          name,
          quantity,
          unitPrice: price,
          amount: Math.round(quantity * price * 100) / 100,
        })),
      ];
      const total = items.reduce((sum, { amount }) => sum + amount, 0);
      const [bill] = await Bill.create(
        [
          {
            appointment: appointment._id,
            consultation: consultation._id,
            pet: pet._id,
            owner: appointment.owner,
            items,
            total,
          },
        ],
        { session },
      );
      await notify(
        {
          owner: appointment.owner,
          pet: pet._id,
          appointment: appointment._id,
          title: "Medical records available",
          message: `${pet.name}'s visit is completed. Medical records and bill (${total.toFixed(2)} PHP) are available.`,
        },
        session,
      );
      await notify(
        {
          owner: appointment.owner,
          pet: pet._id,
          title: "Medical care reminder",
          message: vaccination
            ? `${pet.name} · ${vaccination.vaccine} next due ${vaccination.nextDueDate}.`
            : `${pet.name}: Follow the saved treatment and prescription instructions. ${notes || ""}`,
          dueAt: vaccination ? new Date(vaccination.nextDueDate) : new Date(),
        },
        session,
      );
      await audit(
        req.user,
        "Edit weight",
        "pets",
        pet._id,
        { weight: oldWeight },
        { weight: pet.weight },
        session,
      );
      await audit(
        req.user,
        "Complete",
        "appointments",
        appointment._id,
        { status: "Approved" },
        { status: "Completed" },
        session,
      );
      await audit(
        req.user,
        "Create",
        "consultations",
        consultation._id,
        undefined,
        consultation.toObject(),
        session,
      );
      await audit(
        req.user,
        "Create",
        "bills",
        bill._id,
        undefined,
        bill.toObject(),
        session,
      );
      return { consultation, bill, appointment };
    }),
  );
// Corrections do not re-apply prescriptions, inventory, billing, or weight history.
const updateConsultation = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      const record = await getDoc(Consultation, req.params.id, session);
      const before = record.toObject();
      Object.assign(
        record,
        pick(req.body, ["diagnosis", "treatment", "notes"]),
      );
      await record.save({ session });
      await audit(
        req.user,
        "Edit",
        "consultations",
        record._id,
        before,
        record.toObject(),
        session,
      );
      return record;
    }),
  );
module.exports = { getConsultations, completeConsultation, updateConsultation };
