const { test, after } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config({ path: require("path").join(__dirname, "../server/.env") });
const mongoose = require("mongoose");
const base = process.env.API_BASE || "http://127.0.0.1:4000/api";
const request = async (
  path,
  { token, body, method = body ? "POST" : "GET" } = {},
) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
};
after(async () => mongoose.disconnect());
test("Consultation and Follow-up require detailed owner explanations; Vaccination does not", async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const {
    Appointment,
    Pet,
    Notification,
    Consultation,
    Bill,
  } = require("../server/models");
  const owner = (
    await request("/auth/login", {
      body: { email: "ava@furpaws.test", password: "FurPaws123" },
    })
  ).data.token;
  const admin = (
    await request("/auth/login", {
      body: { email: "admin@furpaws.test", password: "FurPaws123" },
    })
  ).data.token;
  const services = (await request("/services", { token: owner })).data;
  const consultation = services.find(({ name }) => name === "Consultation");
  const followup = services.find(({ name }) => /follow[ -]?up/i.test(name));
  const vaccination = services.find(({ type }) => type === "Vaccination");
  assert.ok(consultation && followup && vaccination);
  const reserved = new Set();
  const slot = async () => {
    for (let offset = 30; offset < 90; offset++) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + offset);
      const date = day.toISOString().slice(0, 10);
      const { data } = await request(`/appointments/slots?date=${date}`, {
        token: owner,
      });
      const time = data.slots.find(
        ({ time, status }) =>
          status === "Available" && !reserved.has(`${date}:${time}`),
      )?.time;
      if (time) {
        reserved.add(`${date}:${time}`);
        return { date, time };
      }
    }
    throw new Error("No test slot available.");
  };
  const prefix = `Visit Details QA ${Date.now()}`;
  const body = {
    bookingType: "No record",
    registration: {
      name: prefix,
      species: "Cat",
      breed: "Domestic shorthair",
      birthDate: "2025-02-10",
      weight: 3.6,
    },
    service: consultation._id,
    ...(await slot()),
  };
  const createdPets = [];
  try {
    for (const service of [consultation, followup]) {
      for (const reasonForVisit of [
        undefined,
        "",
        "   ",
        "Sneezing",
        "x".repeat(2001),
        { text: "Invalid object" },
      ]) {
        const result = await request("/appointments", {
          token: owner,
          body: { ...body, service: service._id, reasonForVisit },
        });
        assert.equal(
          result.status,
          400,
          `${service.name}: ${JSON.stringify(reasonForVisit)?.slice(0, 50)}`,
        );
        assert.ok(result.data.errors.reasonForVisit);
      }
    }
    assert.equal(
      await Pet.countDocuments({ name: prefix }),
      0,
      "Invalid explanation must not create a Pending pet",
    );
    const reason =
      "  My pet has been sneezing for three days. Appetite is lower than usual. No medicine has been given.\nPlease check breathing and temperature.  ";
    for (const service of [consultation, followup]) {
      const result = await request("/appointments", {
        token: owner,
        body: {
          ...body,
          ...(await slot()),
          service: service._id,
          reasonForVisit: reason,
        },
      });
      assert.equal(result.status, 201);
      assert.equal(result.data.reasonForVisit, reason.trim());
      createdPets.push(result.data.pet);
      const adminRows = (await request("/appointments", { token: admin })).data;
      assert.equal(
        adminRows.find(({ _id }) => _id === result.data._id).reasonForVisit,
        reason.trim(),
      );
      const ownerRows = (await request("/appointments", { token: owner })).data;
      assert.equal(
        ownerRows.find(({ _id }) => _id === result.data._id).reasonForVisit,
        reason.trim(),
      );
    }
    const vaccine = await request("/appointments", {
      token: owner,
      body: { ...body, ...(await slot()), service: vaccination._id },
    });
    assert.equal(vaccine.status, 201);
    assert.equal(vaccine.data.reasonForVisit, "");
    createdPets.push(vaccine.data.pet);
  } finally {
    for (const Model of [Appointment, Notification, Consultation, Bill])
      await Model.deleteMany({ pet: { $in: createdPets } });
    await Pet.deleteMany({ _id: { $in: createdPets } });
  }
});
