const models = require("../models");
const {
  fail,
  pick,
  audit,
  transaction,
  getDoc,
  today,
  assertFields,
} = require("../utils/core");
const resources = {
  medicines: [
    "Medicine",
    ["name", "quantity", "unit", "price", "expiryDate", "lowStockThreshold"],
  ],
  services: ["Service", ["name", "description", "fee", "type", "active"]],
  schedules: [
    "Schedule",
    [
      "capacity",
      "dailyCapacity",
      "times",
      "blockedDates",
      "holidays",
      "leaveDates",
      "hours",
    ],
  ],
  expenses: ["Expense", ["category", "amount", "date", "notes"]],
};
const validate = (resource, data) => {
  if (
    resource === "services" &&
    /groom|board|accessor/i.test(`${data.name} ${data.description}`)
  )
    fail(400, "Only medical services are supported.");
  if (resource === "schedules") {
    if (
      data.times &&
      (!data.times.length ||
        data.times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
        new Set(data.times).size !== data.times.length)
    )
      fail(400, "Enter unique times in HH:mm format.");
    if (
      data.hours &&
      (data.hours.length !== 7 ||
        new Set(data.hours.map(({ day }) => day)).size !== 7 ||
        data.hours.some(
          ({ day, open, close, closed }) =>
            day < 0 ||
            day > 6 ||
            (!closed &&
              (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) ||
                !/^([01]\d|2[0-3]):[0-5]\d$/.test(close) ||
                open >= close)),
        ))
    )
      fail(400, "Enter valid hours for all seven days.");
    for (const key of ["blockedDates", "holidays", "leaveDates"])
      if (
        data[key]?.some(
          (date) =>
            !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)),
        )
      )
        fail(400, "Use dates in YYYY-MM-DD format.");
  }
};
const controllerFor = (resource) => {
  const [model, keys] = resources[resource];
  const Model = models[model];
  const getX = async (req, res) =>
    res.json(
      await Model.find(
        resource === "services" && req.user.role === "OWNER"
          ? { active: true }
          : {},
      ).sort({ createdAt: -1 }),
    );
  const createX = async (req, res) => {
    if (resource === "schedules")
      fail(409, "Edit the existing clinic schedule.");
    assertFields(req.body, keys);
    const data = pick(req.body, keys);
    validate(resource, data);
    res.status(201).json(
      await transaction(async (session) => {
        const [record] = await Model.create([data], { session });
        await audit(
          req.user,
          resource === "medicines" ? "Stock change · Create" : "Create",
          resource,
          record._id,
          undefined,
          record.toObject(),
          session,
        );
        return record;
      }),
    );
  };
  const updateX = async (req, res) => {
    assertFields(req.body, keys);
    const data = pick(req.body, keys);
    validate(resource, data);
    res.json(
      await transaction(async (session) => {
        const record = await getDoc(Model, req.params.id, session);
        const before = record.toObject();
        Object.assign(record, data);
        if (resource === "schedules") record.revision += 1;
        await record.save({ session });
        await audit(
          req.user,
          resource === "medicines" && before.quantity !== record.quantity
            ? "Stock change"
            : "Edit",
          resource,
          record._id,
          before,
          record.toObject(),
          session,
        );
        return record;
      }),
    );
  };
  const deleteX = async (req, res) => {
    if (resource === "schedules")
      fail(400, "The clinic schedule cannot be deleted.");
    await transaction(async (session) => {
      const record = await getDoc(Model, req.params.id, session);
      if (
        resource === "services" &&
        (await models.Appointment.exists({ service: record._id }).session(
          session,
        ))
      )
        fail(409, "This service has bookings. Deactivate it instead.");
      if (
        resource === "medicines" &&
        (await models.Consultation.exists({
          "prescriptions.medicine": record._id,
        }).session(session))
      )
        fail(
          409,
          "This medicine is linked to historical clinical records. Keep it for traceability.",
        );
      await Model.deleteOne({ _id: record._id }, { session });
      await audit(
        req.user,
        resource === "medicines" ? "Stock change · Delete" : "Delete",
        resource,
        record._id,
        record.toObject(),
        undefined,
        session,
      );
    });
    res.status(204).end();
  };
  return { getX, createX, updateX, deleteX };
};
const getBills = async (req, res) =>
  res.json(
    await models.Bill.find()
      .populate("pet")
      .populate("owner", "name")
      .populate("appointment")
      .sort({ createdAt: -1 }),
  );
const updateBill = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["status", "paymentMethod"]);
      const bill = await getDoc(models.Bill, req.params.id, session);
      if (bill.status === "Paid")
        fail(409, "Payment has already been recorded.");
      if (
        req.body.status !== "Paid" ||
        !["Cash", "GCash", "Card", "Bank transfer"].includes(
          req.body.paymentMethod,
        )
      )
        fail(400, "Choose a payment method.");
      const before = bill.toObject();
      bill.status = "Paid";
      bill.paymentMethod = req.body.paymentMethod;
      bill.paidAt = new Date();
      await bill.save({ session });
      await audit(
        req.user,
        "Edit payment",
        "bills",
        bill._id,
        before,
        bill.toObject(),
        session,
      );
      return bill;
    }),
  );
const getVaccinations = async (req, res) =>
  res.json(
    await models.Vaccination.find().populate("pet").populate("owner", "name"),
  );
const getNotifications = async (req, res) =>
  res.json(
    await models.Notification.find(
      req.user.role === "OWNER"
        ? { owner: req.user._id, audience: { $ne: "ADMIN" } }
        : req.query.scope === "inbox"
          ? { owner: req.user._id, audience: "ADMIN" }
          : { audience: { $ne: "ADMIN" } },
    )
      .populate("owner", "name")
      .sort({ createdAt: -1 }),
  );
const updateNotification = async (req, res) =>
  res.json(
    await transaction(async (session) => {
      assertFields(req.body, ["read"]);
      const notification = await getDoc(
        models.Notification,
        req.params.id,
        session,
      );
      if (
        String(notification.owner) !== String(req.user._id) ||
        (req.user.role === "ADMIN" && notification.audience !== "ADMIN")
      )
        fail(404, "Notification not found.");
      const before = { read: notification.read };
      notification.read = true;
      await notification.save({ session });
      await audit(
        req.user,
        "Edit read status",
        "notifications",
        notification._id,
        before,
        { read: true },
        session,
      );
      return notification;
    }),
  );
const getAuditlogs = async (req, res) =>
  res.json(await models.AuditLog.find().sort({ createdAt: -1 }));
const getReports = async (req, res) => {
  const { start = "2000-01-01", end = today() } = req.query;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    start > end
  )
    fail(400, "Choose a valid reporting period.");
  const range = {
    $gte: new Date(`${start}T00:00:00+08:00`),
    $lte: new Date(`${end}T23:59:59.999+08:00`),
  };
  const [bills, expenses, appointments, consultations] = await Promise.all([
    models.Bill.find({ paidAt: range, status: "Paid" }),
    models.Expense.find({ date: range }),
    models.Appointment.find({ date: { $gte: start, $lte: end } }),
    models.Consultation.countDocuments({ createdAt: range }),
  ]);
  const revenue = bills.reduce((sum, { total }) => sum + total, 0);
  const cost = expenses.reduce((sum, { amount }) => sum + amount, 0);
  res.json({
    start,
    end,
    revenue,
    expenses: cost,
    netIncome: revenue - cost,
    payments: bills.length,
    consultations,
    activeServices: await models.Service.countDocuments({ active: true }),
    distribution: [
      "Pending",
      "Approved",
      "Declined",
      "Completed",
      "Cancelled",
    ].map((status) => ({
      status,
      count: appointments.filter((appointment) => appointment.status === status)
        .length,
    })),
    total: appointments.length,
  });
};
module.exports = {
  controllerFor,
  getBills,
  updateBill,
  getVaccinations,
  getNotifications,
  updateNotification,
  getAuditlogs,
  getReports,
};
