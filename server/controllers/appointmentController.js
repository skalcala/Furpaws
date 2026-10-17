const { Appointment, Pet, Service, Schedule } = require("../models");
const {
  fail,
  pick,
  today,
  audit,
  notify,
  notifyAdmins,
  assertFields,
  transaction,
  getDoc,
} = require("../utils/core");
// Updating the shared schedule document serializes all bookings and schedule changes.
// Transactions retry on concurrent writes, so capacity is checked against committed data.
const lockSchedule = async (session) =>
  Schedule.findOneAndUpdate(
    { key: "clinic" },
    { $inc: { revision: 1 } },
    { new: true, session },
  );
const slotState = async (date, time, schedule, session, excludeId) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(date)) ||
    !/^\d{2}:\d{2}$/.test(String(time)) ||
    Number.isNaN(new Date(`${date}T${time}:00+08:00`).valueOf()) ||
    new Date(`${date}T${time}:00+08:00`) <= new Date()
  )
    return "Past";
  const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  const hours = schedule.hours.find(({ day }) => day === weekday);
  if (
    [
      ...schedule.blockedDates,
      ...schedule.holidays,
      ...schedule.leaveDates,
    ].includes(date) ||
    !hours ||
    hours.closed ||
    time < hours.open ||
    time >= hours.close ||
    !schedule.times.includes(time)
  )
    return "Blocked";
  const filter = {
    date,
    source: { $ne: "Emergency" },
    status: { $in: ["Pending", "Approved", "Completed"] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };
  const [daily, slot] = await Promise.all([
    Appointment.countDocuments(filter).session(session || null),
    Appointment.countDocuments({ ...filter, time }).session(session || null),
  ]);
  return daily >= schedule.dailyCapacity || slot >= schedule.capacity
    ? "Full"
    : "Available";
};
const validateSlot = async (date, time, session, excludeId) => {
  const schedule = await lockSchedule(session);
  if (!schedule) fail(500, "Clinic schedule has not been configured.");
  const state = await slotState(date, time, schedule, session, excludeId);
  if (state !== "Available")
    fail(
      409,
      state === "Full"
        ? "This slot is full. Choose another time."
        : "This slot is blocked or in the past.",
      { time: `Slot is ${state.toLowerCase()}.` },
    );
};
// First open slot on `date`, trying `preferredTime` first. Used when the clinic
// schedules a pet's next vaccination automatically.
const findOpenSlot = async (date, preferredTime, session) => {
  const schedule = await lockSchedule(session);
  if (!schedule) return null;
  const candidates = [
    preferredTime,
    ...schedule.times.filter((time) => time !== preferredTime),
  ];
  for (const time of candidates)
    if ((await slotState(date, time, schedule, session)) === "Available")
      return time;
  return null;
};
const getSlots = async (req, res) => {
  const schedule = await Schedule.findOne({ key: "clinic" });
  if (!schedule) fail(503, "Clinic schedule is not configured.");
  const date = req.query.date || today();
  let excludeId;
  if (req.query.excludeId) {
    if (req.user.role !== "ADMIN")
      fail(403, "Only an Admin may preview a reschedule.");
    const appointment = await getDoc(Appointment, req.query.excludeId);
    excludeId = appointment._id;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, "Choose a valid date.");
  const slots = await Promise.all(
    schedule.times.map(async (time) => ({
      time,
      status: await slotState(date, time, schedule, null, excludeId),
    })),
  );
  res.json({ date, slots, capacity: schedule.capacity });
};
const getAppointments = async (req, res) =>
  res.json(
    await Appointment.find(
      req.user.role === "OWNER" ? { owner: req.user._id } : {},
    )
      .populate("pet")
      .populate("owner", "name phone email")
      .populate("service")
      .populate("admin", "name")
      .sort({ date: 1, time: 1 }),
  );
const createAppointment = async (req, res) =>
  res.status(201).json(
    await transaction(async (session) => {
      assertFields(req.body, [
        "bookingType",
        "date",
        "time",
        "service",
        "pet",
        "registration",
        "reasonForVisit",
      ]);
      const {
        bookingType,
        date,
        time,
        service: serviceId,
        pet: petId,
        registration,
        reasonForVisit,
      } = req.body;
      if (!["With record", "No record"].includes(bookingType))
        fail(400, "Choose a booking type.");
      const service = await getDoc(Service, serviceId, session);
      if (!service.active) fail(400, "This service is unavailable.");
      const isFollowUp = /follow[ -]?up/i.test(service.name);
      if (isFollowUp && bookingType !== "With record")
        fail(
          400,
          "Follow-up checkups require an existing approved pet record.",
          { service: "Choose a general consultation for a new pet." },
        );
      const explanation =
        typeof reasonForVisit === "string" ? reasonForVisit.trim() : "";
      if (
        (service.type === "Consultation" &&
          !isFollowUp &&
          explanation.length < 20) ||
        explanation.length > 2000 ||
        (reasonForVisit !== undefined && typeof reasonForVisit !== "string")
      ) {
        fail(
          400,
          "Please describe your pet’s symptoms or follow-up concerns.",
          {
            reasonForVisit:
              "Please give a detailed explanation using 20–2,000 characters.",
          },
        );
      }
      let estimatedWeight;
      if (registration !== undefined)
        assertFields(registration, [
          "name",
          "species",
          "otherSpecies",
          "breed",
          "birthDate",
          "weight",
          "estimatedWeight",
          "picture",
        ]);
      if (bookingType === "No record" && registration) {
        estimatedWeight =
          await require("../utils/petOptions").validatePetRegistration(
            registration,
          );
      }
      await validateSlot(date, time, session);
      let pet;
      if (bookingType === "With record") {
        pet = await getDoc(Pet, petId, session);
        if (
          String(pet.owner) !== String(req.user._id) ||
          pet.status !== "Approved"
        )
          fail(403, "Choose one of your approved pets.");
      } else {
        if (!registration)
          fail(400, "Please complete the pet registration form.");
        if (new Date(registration.birthDate) > new Date())
          fail(400, "Birth date cannot be in the future.", {
            birthDate: "Choose a past date.",
          });
        const normalizedName = String(registration.name || "").trim();
        const samePets = await Pet.find({
          owner: req.user._id,
          name: normalizedName,
          species: registration.species,
          ...(registration.species === "Other"
            ? { otherSpecies: registration.otherSpecies }
            : {}),
          birthDate: registration.birthDate,
        })
          .collation({ locale: "en", strength: 2 })
          .select("_id")
          .session(session);
        if (
          samePets.length &&
          (await Appointment.exists({
            pet: { $in: samePets.map((p) => p._id) },
            date,
            time,
            status: { $in: ["Pending", "Approved", "Completed"] },
          }).session(session))
        )
          fail(
            409,
            "This pet already has a booking for the selected date and time.",
          );
        const [created] = await Pet.create(
          [
            {
              ...pick(registration, [
                "name",
                "species",
                "breed",
                "birthDate",
                "otherSpecies",
                "picture",
              ]),
              estimatedWeight,
              owner: req.user._id,
              status: "Pending",
            },
          ],
          { session },
        );
        pet = created;
      }
      if (
        await Appointment.exists({
          pet: pet._id,
          date,
          time,
          status: { $in: ["Pending", "Approved", "Completed"] },
        }).session(session)
      )
        fail(409, "This pet already has an appointment in this slot.");
      const [appointment] = await Appointment.create(
        [
          {
            owner: req.user._id,
            pet: pet._id,
            service: serviceId,
            date,
            time,
            bookingType,
            reasonForVisit: explanation,
            status: "Pending",
          },
        ],
        { session },
      );
      await notifyAdmins(
        {
          pet: pet._id,
          appointment: appointment._id,
          title: "New appointment request",
          message: `${req.user.name} booked ${pet.name} for ${service.name} on ${date} at ${time}. Review the Pending booking in Approvals.`,
        },
        session,
      );
      await audit(
        req.user,
        "Create",
        "appointments",
        appointment._id,
        undefined,
        appointment.toObject(),
        session,
      );
      return appointment;
    }),
  );
const decideAppointment = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["status", "reason"]);
      const { status, reason } = req.body;
      if (!["Approved", "Declined"].includes(status))
        fail(400, "Choose Approve or Decline.");
      if (
        status === "Declined" &&
        (!reason?.trim() || reason.trim().length > 500)
      )
        fail(400, "Decline reason is required (up to 500 characters).", {
          reason: "Decline reason is required (up to 500 characters).",
        });
      const appointment = await getDoc(Appointment, req.params.id, session);
      if (appointment.status !== "Pending")
        fail(409, "This booking has already been reviewed.");
      const before = appointment.toObject();
      if (status === "Approved") {
        await validateSlot(
          appointment.date,
          appointment.time,
          session,
          appointment._id,
        );
        const pet = await getDoc(Pet, appointment.pet, session);
        if (pet.status !== "Approved") {
          const beforePet = pet.toObject();
          pet.status = "Approved";
          await pet.save({ session });
          await audit(
            req.user,
            "Approve",
            "pets",
            pet._id,
            beforePet,
            pet.toObject(),
            session,
          );
        }
      }
      appointment.status = status;
      appointment.declineReason = status === "Declined" ? reason.trim() : "";
      appointment.admin = req.user._id;
      await appointment.save({ session });
      await notify(
        {
          owner: appointment.owner,
          pet: appointment.pet,
          appointment: appointment._id,
          title: `Appointment ${status.toLowerCase()}`,
          message: `${status}: ${appointment.date} at ${appointment.time}.${status === "Declined" ? ` Reason: ${reason.trim()}` : ""}`,
        },
        session,
      );
      await audit(
        req.user,
        status === "Approved" ? "Approve" : "Decline",
        "appointments",
        appointment._id,
        before,
        appointment.toObject(),
        session,
      );
      return appointment;
    }),
  );
const updateAppointment = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, [
        "status",
        "cancellationReason",
        "date",
        "time",
        "service",
        "reasonForVisit",
      ]);
      const appointment = await getDoc(Appointment, req.params.id, session);
      if (
        req.user.role === "OWNER" &&
        String(appointment.owner) !== String(req.user._id)
      )
        fail(404, "Appointment not found.");
      if (!["Pending", "Approved"].includes(appointment.status))
        fail(409, "Only Pending or Approved bookings may be changed.");
      const before = appointment.toObject();
      if (req.body.status && req.body.status !== "Cancelled")
        fail(400, "Only cancellation is allowed through this status change.");
      if (
        req.body.reasonForVisit !== undefined &&
        typeof req.body.reasonForVisit !== "string"
      )
        fail(400, "Visit details must be text.");
      if (req.body.status === "Cancelled") {
        const reason =
          typeof req.body.cancellationReason === "string"
            ? req.body.cancellationReason.trim()
            : "";
        if (reason.length < 5 || reason.length > 500)
          fail(400, "A cancellation reason is required (5–500 characters).", {
            cancellationReason:
              "Explain why this appointment is being cancelled (5–500 characters).",
          });
        appointment.status = "Cancelled";
        appointment.cancellationReason = reason;
        appointment.cancelledBy = req.user._id;
        appointment.cancelledAt = new Date();
      } else {
        if (req.user.role !== "ADMIN")
          fail(403, "Only an Admin may reschedule.");
        if (appointment.source === "Emergency")
          fail(
            409,
            "An emergency encounter cannot be rescheduled. Cancel it or complete the consultation.",
          );
        const service = await getDoc(
          Service,
          req.body.service || appointment.service,
          session,
        );
        if (!service.active) fail(400, "Choose an active service.");
        const isFollowUp = /follow[ -]?up/i.test(service.name);
        if (isFollowUp && appointment.bookingType !== "With record")
          fail(400, "Follow-up checkups require an existing pet record.");
        const explanation = String(
          req.body.reasonForVisit ?? appointment.reasonForVisit ?? "",
        ).trim();
        if (
          service.type === "Consultation" &&
          ((!isFollowUp && explanation.length < 20) ||
            explanation.length > 2000)
        )
          fail(400, "Consultation details are required for this service.", {
            reasonForVisit: "Use 20–2,000 characters to describe the visit.",
          });
        appointment.service = service._id;
        appointment.reasonForVisit =
          service.type === "Consultation" ? explanation : "";
        await validateSlot(
          req.body.date,
          req.body.time,
          session,
          appointment._id,
        );
        if (
          await Appointment.exists({
            _id: { $ne: appointment._id },
            pet: appointment.pet,
            date: req.body.date,
            time: req.body.time,
            status: { $in: ["Pending", "Approved", "Completed"] },
          }).session(session)
        )
          fail(409, "This pet already has a booking in this slot.");
        appointment.date = req.body.date;
        appointment.time = req.body.time;
      }
      await appointment.save({ session });
      await audit(
        req.user,
        "Edit",
        "appointments",
        appointment._id,
        before,
        appointment.toObject(),
        session,
      );
      await notify(
        {
          owner: appointment.owner,
          appointment: appointment._id,
          title: `Appointment ${appointment.status === "Cancelled" ? "cancelled" : "rescheduled"}`,
          message: `${appointment.date} at ${appointment.time} · ${appointment.status}${appointment.cancellationReason ? ` · Reason: ${appointment.cancellationReason}` : ""}`,
        },
        session,
      );
      if (req.user.role === "OWNER")
        await notifyAdmins(
          {
            appointment: appointment._id,
            pet: appointment.pet,
            title: "Owner cancelled an appointment",
            message: `${req.user.name} cancelled the booking on ${appointment.date} at ${appointment.time}. Reason: ${appointment.cancellationReason}`,
          },
          session,
        );
      return appointment;
    }),
  );
module.exports = {
  getSlots,
  getAppointments,
  createAppointment,
  decideAppointment,
  updateAppointment,
  findOpenSlot,
};
