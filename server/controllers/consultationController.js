const {
  Appointment,
  Consultation,
  Pet,
  Service,
  Bill,
  Vaccination,
  User,
  Schedule,
} = require("../models");
const {
  fail,
  pick,
  audit,
  notify,
  transaction,
  getDoc,
  today,
  assertFields,
} = require("../utils/core");
const { normalizePhone } = require("../utils/phone");
const getConsultations = async (req, res) =>
  res.json(
    await Consultation.find()
      .select("-prescriptions")
      .populate("pet")
      .populate("admin", "name")
      .sort({ createdAt: -1 }),
  );
function followUpDetails(value) {
  if (value === undefined) return { enabled: false };
  assertFields(value, ["enabled", "date", "purpose", "instructions"]);
  if (typeof value.enabled !== "boolean")
    fail(400, "Choose whether a follow-up is needed.");
  if (!value.enabled) return { enabled: false };
  if (
    typeof value.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
    Number.isNaN(Date.parse(value.date)) ||
    value.date < today()
  )
    fail(400, "Choose a follow-up date today or later.", {
      followUpDate: "Choose a valid follow-up date.",
    });
  for (const key of ["purpose", "instructions"])
    if (
      value[key] !== undefined &&
      (typeof value[key] !== "string" || value[key].length > 2000)
    )
      fail(400, "Follow-up text must be at most 2,000 characters.");
  if (!value.purpose?.trim())
    fail(400, "Describe the purpose of the follow-up.", {
      followUpPurpose: "Enter the follow-up purpose.",
    });
  return {
    enabled: true,
    date: value.date,
    purpose: value.purpose.trim(),
    instructions: (value.instructions || "").trim(),
  };
}
const completeConsultation = async (req, res) =>
  res.status(201).json(
    await transaction(async (session) => {
      assertFields(req.body, [
        "appointment",
        "weight",
        "diagnosis",
        "treatment",
        "notes",
        "followUp",
        "vaccination",
      ]);
      const {
        appointment: appointmentId,
        weight,
        diagnosis,
        treatment,
        notes,
        vaccination,
      } = req.body;
      const followUp = followUpDetails(req.body.followUp);
      const appointment = await getDoc(Appointment, appointmentId, session);
      if (appointment.status !== "Approved")
        fail(409, "Consultations require an Approved appointment.");
      const service = await getDoc(Service, appointment.service, session);
      const vaccineService = service.type === "Vaccination";
      if (
        typeof weight !== "number" ||
        !Number.isFinite(weight) ||
        weight <= 0 ||
        weight > 500
      )
        fail(
          400,
          "Enter a measured weight greater than 0 and at most 500 kg.",
          { weight: "Enter the measured weight in kg." },
        );
      for (const [key, value] of Object.entries({
        diagnosis,
        treatment,
        notes,
      }))
        if (
          value !== undefined &&
          (typeof value !== "string" || value.length > 2000)
        )
          fail(400, "Clinical notes must be text, up to 2,000 characters.", {
            [key]: "Enter valid text.",
          });
      if (!vaccineService && (!diagnosis?.trim() || !treatment?.trim()))
        fail(400, "Diagnosis and treatment are required.", {
          diagnosis: !diagnosis?.trim() ? "Diagnosis is required." : undefined,
          treatment: !treatment?.trim() ? "Treatment is required." : undefined,
        });
      if (vaccineService && !vaccination)
        fail(400, "Vaccination details are required.");
      if (vaccination) {
        assertFields(vaccination, ["vaccine", "dateGiven", "nextDueDate"]);
        if (
          !["Rabies", "DHPP", "FVRCP"].includes(vaccination.vaccine) ||
          !vaccination.dateGiven ||
          !vaccination.nextDueDate ||
          Number.isNaN(Date.parse(vaccination.dateGiven)) ||
          Number.isNaN(Date.parse(vaccination.nextDueDate)) ||
          vaccination.dateGiven > today() ||
          vaccination.nextDueDate <= vaccination.dateGiven
        )
          fail(
            400,
            "Use a valid vaccine, a past/today date given, and a later due date.",
            { nextDueDate: "Next due date must be after date given." },
          );
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
            followUp,
          },
        ],
        { session },
      );
      const pet = await getDoc(Pet, appointment.pet, session);
      const oldWeight = pet.weight;
      pet.weight = weight;
      pet.status = "Approved";
      pet.weightHistory.push({ date: new Date(), weight });
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
      ];
      const [bill] = await Bill.create(
        [
          {
            appointment: appointment._id,
            consultation: consultation._id,
            pet: pet._id,
            owner: appointment.owner,
            items,
            total: service.fee,
          },
        ],
        { session },
      );
      const owner = await getDoc(User, appointment.owner, session);
      if (owner.accountType !== "guest") {
        await notify(
          {
            owner: owner._id,
            pet: pet._id,
            appointment: appointment._id,
            title: "Medical records available",
            message: `${pet.name}'s visit is completed. Medical records and bill (${service.fee.toFixed(2)} PHP) are available.`,
          },
          session,
        );
        await notify(
          {
            owner: owner._id,
            pet: pet._id,
            title: followUp.enabled
              ? "Follow-up checkup recommended"
              : "Medical care reminder",
            message: followUp.enabled
              ? `${pet.name} · Suggested checkup ${followUp.date}. ${followUp.purpose}. ${followUp.instructions} Please book an available appointment.`
              : vaccination
                ? `${pet.name} · ${vaccination.vaccine} next due ${vaccination.nextDueDate}.`
                : `${pet.name}: Follow the saved treatment and care instructions. ${notes || ""}`,
            dueAt: followUp.enabled
              ? new Date(`${followUp.date}T00:00:00+08:00`)
              : vaccination
                ? new Date(vaccination.nextDueDate)
                : new Date(),
          },
          session,
        );
      }
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
const startEmergency = async (req, res) =>
  res.status(201).json(
    await transaction(async (session) => {
      assertFields(req.body, [
        "pet",
        "owner",
        "contact",
        "registration",
        "reasonForVisit",
        "requestId",
      ]);
      if (!/^[0-9a-f-]{36}$/i.test(req.body.requestId || ""))
        fail(400, "A valid request identifier is required.");
      const emergencyRequestKey = `${req.user._id}:${req.body.requestId}`;
      const prior = await Appointment.findOne({ emergencyRequestKey }).session(
        session,
      );
      if (prior) return prior;
      const schedule = await Schedule.findOneAndUpdate(
        { key: "clinic" },
        { $inc: { revision: 1 } },
        { session, new: true },
      );
      if (!schedule)
        fail(
          503,
          "The clinic schedule must be configured before recording a visit.",
        );
      if (
        typeof req.body.reasonForVisit !== "string" ||
        req.body.reasonForVisit.trim().length < 5 ||
        req.body.reasonForVisit.length > 2000
      )
        fail(400, "Describe the emergency (5–2,000 characters).", {
          reasonForVisit: "Enter the emergency concern.",
        });
      const service = await Service.findOne({
        type: "Consultation",
        active: true,
        name: { $not: /follow[ -]?up/i },
      }).session(session);
      if (!service)
        fail(
          409,
          "Activate a general consultation service before starting an emergency visit.",
        );
      let pet;
      if (req.body.pet) {
        pet = await getDoc(Pet, req.body.pet, session);
        const existing = await Appointment.findOne({
          pet: pet._id,
          date: today(),
          status: { $in: ["Pending", "Approved"] },
        }).session(session);
        if (existing)
          fail(
            409,
            "This pet already has an active visit today. Review the existing visit first.",
            {
              existingAppointment: String(existing._id),
              existingStatus: existing.status,
            },
          );
      } else {
        let owner;
        if (req.body.owner) owner = await getDoc(User, req.body.owner, session);
        else {
          assertFields(req.body.contact, ["name", "phone", "address"]);
          if (
            typeof req.body.contact.name !== "string" ||
            req.body.contact.name.trim().length < 2
          )
            fail(400, "Enter an owner/contact name, or Unknown owner.");
          owner = (
            await User.create(
              [
                {
                  name: req.body.contact.name,
                  phone: req.body.contact.phone
                    ? normalizePhone(req.body.contact.phone)
                    : undefined,
                  address: req.body.contact.address,
                  email: `emergency-${require("crypto").randomUUID()}@furpaws.invalid`,
                  accountType: "guest",
                  role: "OWNER",
                },
              ],
              { session },
            )
          )[0];
          await audit(
            req.user,
            "Create emergency contact",
            "users",
            owner._id,
            undefined,
            { name: owner.name, accountType: "guest" },
            session,
          );
        }
        assertFields(req.body.registration, [
          "name",
          "species",
          "otherSpecies",
          "breed",
          "birthDate",
          "estimatedWeight",
          "picture",
        ]);
        const registration = req.body.registration;
        const estimatedWeight =
          await require("../utils/petOptions").validatePetRegistration(
            registration,
          );
        if (
          registration.birthDate &&
          (Number.isNaN(Date.parse(registration.birthDate)) ||
            registration.birthDate > today())
        )
          fail(
            400,
            "Enter a valid birth date no later than today, or leave it blank.",
          );
        pet = (
          await Pet.create(
            [
              {
                ...pick(registration, [
                  "name",
                  "species",
                  "otherSpecies",
                  "breed",
                  "picture",
                ]),
                birthDate: registration.birthDate || undefined,
                estimatedWeight,
                owner: owner._id,
                status: "Approved",
                emergencyRegistration: true,
              },
            ],
            { session },
          )
        )[0];
        await audit(
          req.user,
          "Register emergency pet",
          "pets",
          pet._id,
          undefined,
          { name: pet.name, owner: owner._id, status: pet.status },
          session,
        );
      }
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      const [appointment] = await Appointment.create(
        [
          {
            pet: pet._id,
            owner: pet.owner,
            service: service._id,
            admin: req.user._id,
            date: today(),
            time,
            bookingType: req.body.pet ? "With record" : "No record",
            source: "Emergency",
            status: "Approved",
            reasonForVisit: req.body.reasonForVisit.trim(),
            emergencyRequestKey,
          },
        ],
        { session },
      );
      await audit(
        req.user,
        "Start emergency consultation",
        "appointments",
        appointment._id,
        undefined,
        appointment.toObject(),
        session,
      );
      return appointment;
    }),
  );
const updateConsultation = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["diagnosis", "treatment", "notes", "followUp"]);
      const record = await getDoc(Consultation, req.params.id, session);
      const before = record.toObject();
      Object.assign(
        record,
        pick(req.body, ["diagnosis", "treatment", "notes"]),
      );
      if (req.body.followUp !== undefined)
        record.followUp = followUpDetails(req.body.followUp);
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
module.exports = {
  getConsultations,
  completeConsultation,
  updateConsultation,
  startEmergency,
};
