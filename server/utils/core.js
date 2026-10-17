const mongoose = require("mongoose");
const { AuditLog, Notification } = require("../models");
const fail = (status, message, errors) => {
  const error = new Error(message);
  error.status = status;
  error.errors = errors;
  throw error;
};
const pick = (body, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]]),
  );
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const audit = async (user, action, resource, record, before, after, session) =>
  AuditLog.create(
    [
      {
        actor: user._id,
        actorName: user.name,
        action,
        resource,
        record: String(record),
        before,
        after,
      },
    ],
    { session },
  );
const notify = async (data, session) =>
  Notification.create([data], { session });
const transaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};
const getDoc = async (Model, id, session) => {
  if (!mongoose.isValidObjectId(id)) fail(404, "Record not found.");
  const doc = await Model.findById(id).session(session || null);
  if (!doc) fail(404, "Record not found.");
  return doc;
};
module.exports = { fail, pick, today, audit, notify, transaction, getDoc };
