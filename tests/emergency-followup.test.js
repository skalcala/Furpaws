const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").join(__dirname, "../server/.env"),
  quiet: true,
});
const base = process.env.API_BASE || "http://127.0.0.1:4000/api";
const request = async (
  path,
  { token, body, method = body ? "POST" : "GET" } = {},
) => {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
};
after(() => mongoose.disconnect());
test("Phone/email sign-in, emergency existing/guest records, optional follow-up, duplicate prevention and no prescription creation", async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const M = require("../server/models");
  const admin = await request("/auth/login", {
    body: { identifier: "09175550100", password: "FurPaws123" },
  });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, "ADMIN");
  const owner = await request("/auth/login", {
    body: { identifier: "+639175550142", password: "FurPaws123" },
  });
  assert.equal(owner.status, 200);
  const other = (
    await request("/auth/login", {
      body: { email: "noah@furpaws.test", password: "FurPaws123" },
    })
  ).data;
  assert.equal(
    (
      await request("/auth/login", {
        body: { identifier: "09175550100", password: "wrong" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await request("/auth/phone/send", { body: { phone: "09175550142" } }))
      .status,
    503,
  );
  const pet = await M.Pet.create({
    owner: other.user._id,
    name: "Emergency regression " + Date.now(),
    species: "Dog",
    breed: "Aspin",
    birthDate: "2024-01-01",
    status: "Approved",
  });
  const body = {
    pet: String(pet._id),
    reasonForVisit: "Emergency test: urgent assessment requested.",
    requestId: crypto.randomUUID(),
  };
  assert.equal(
    (
      await request("/consultations/emergency", {
        token: owner.data.token,
        body,
      })
    ).status,
    403,
  );
  const emergency = await request("/consultations/emergency", {
    token: admin.data.token,
    body,
  });
  assert.equal(emergency.status, 201);
  assert.equal(emergency.data.source, "Emergency");
  assert.equal(emergency.data.pet, String(pet._id));
  const repeated = await request("/consultations/emergency", {
    token: admin.data.token,
    body,
  });
  assert.equal(repeated.data._id, emergency.data._id);
  assert.equal(
    (
      await request("/consultations/emergency", {
        token: admin.data.token,
        body: { ...body, requestId: crypto.randomUUID() },
      })
    ).status,
    409,
  );
  const completion = {
    appointment: emergency.data._id,
    weight: 7.2,
    diagnosis: "Emergency assessment",
    treatment: "Stabilized and monitored",
    notes: "Regression fixture only",
  };
  assert.equal(
    (
      await request("/consultations/complete", {
        token: admin.data.token,
        body: { ...completion, prescriptions: [] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/consultations/complete", {
        token: admin.data.token,
        body: { ...completion, weight: "abc" },
      })
    ).status,
    400,
  );
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const finished = await request("/consultations/complete", {
    token: admin.data.token,
    body: {
      ...completion,
      followUp: {
        enabled: true,
        date,
        purpose: "Recheck recovery",
        instructions: "Bring the prior visit record.",
      },
    },
  });
  assert.equal(finished.status, 201);
  assert(finished.data.consultation.followUp.enabled);
  assert.equal(finished.data.bill.items.length, 1);
  const own = await request(`/pets/${pet._id}/records`, { token: other.token });
  assert.equal(own.status, 200);
  assert.equal(own.data.consultations[0].followUp.purpose, "Recheck recovery");
  assert(!("prescriptions" in own.data.consultations[0]));
  assert.equal(
    (await request(`/pets/${pet._id}/records`, { token: owner.data.token }))
      .status,
    404,
  );
  const guest = await request("/consultations/emergency", {
    token: admin.data.token,
    body: {
      requestId: crypto.randomUUID(),
      reasonForVisit: "New emergency patient without an account.",
      contact: { name: "Emergency guest test" },
      registration: {
        name: "Guest patient",
        species: "Other",
        otherSpecies: "Rabbit",
        breed: "Unknown",
      },
    },
  });
  assert.equal(guest.status, 201);
  const contact = await M.User.findById(guest.data.owner).select(
    "+passwordHash",
  );
  assert.equal(contact.accountType, "guest");
  assert(!contact.passwordHash);
  assert.equal(
    (
      await request("/auth/login", {
        body: { identifier: contact.email, password: "anything" },
      })
    ).status,
    401,
  );
  const guestDone = await request("/consultations/complete", {
    token: admin.data.token,
    body: {
      appointment: guest.data._id,
      weight: 1.3,
      diagnosis: "Assessment",
      treatment: "Observation",
    },
  });
  assert.equal(guestDone.status, 201);
  assert.equal(guestDone.data.consultation.followUp.enabled, false);
  // Same new-pet submission posted twice must not create duplicate pet bookings.
  let slot;
  for (let offset = 100; offset < 130 && !slot; offset++) {
    const date = new Date(Date.now() + offset * 86400000)
      .toISOString()
      .slice(0, 10);
    const value = (
      await request("/appointments/slots?date=" + date, {
        token: owner.data.token,
      })
    ).data.slots.find((s) => s.status === "Available");
    if (value) slot = { date, time: value.time };
  }
  const consultationService = (
    await request("/services", { token: owner.data.token })
  ).data.find((s) => s.name === "Consultation");
  const duplicateBody = {
    bookingType: "No record",
    ...slot,
    service: consultationService._id,
    reasonForVisit: "A routine checkup to review general health and appetite.",
    registration: {
      name: "Duplicate regression " + Date.now(),
      species: "Dog",
      breed: "Aspin",
      birthDate: "2024-01-01",
    },
  };
  const concurrent = await Promise.all([
    request("/appointments", { token: owner.data.token, body: duplicateBody }),
    request("/appointments", { token: owner.data.token, body: duplicateBody }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    await M.Pet.countDocuments({ name: duplicateBody.registration.name }),
    1,
  );
  const registration = await request("/auth/register", {
    body: {
      name: "Phone uniqueness test",
      phone: "09179999003",
      email: `phone-${Date.now()}@example.test`,
      password: "PhoneTest123",
    },
  });
  assert.equal(registration.status, 201);
  assert.equal(
    (
      await request("/auth/login", {
        body: { identifier: "+639179999003", password: "PhoneTest123" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/auth/register", {
        body: {
          name: "Duplicate phone",
          phone: "+639179999003",
          email: `other-${Date.now()}@example.test`,
          password: "PhoneTest123",
        },
      })
    ).status,
    409,
  );
  const guestIds = [pet._id, guest.data.pet];
  for (const Model of [
    M.Appointment,
    M.Consultation,
    M.Bill,
    M.Notification,
    M.Vaccination,
  ])
    await Model.deleteMany({ pet: { $in: guestIds } });
  await M.Pet.deleteMany({ _id: { $in: guestIds } });
  await M.User.deleteOne({ _id: contact._id });
});
test("SMS provider integration validates approval and phone-bound tickets using a mocked provider", async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const controller = require("../server/controllers/phoneVerificationController");
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  process.env.TWILIO_ACCOUNT_SID = "AC" + "a".repeat(32);
  process.env.TWILIO_AUTH_TOKEN = "unit-test-only";
  process.env.TWILIO_VERIFY_SERVICE_SID = "VA" + "b".repeat(32);
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, values: new URLSearchParams(options.body) });
    return {
      ok: true,
      json: async () => ({
        status: url.endsWith("/VerificationCheck") ? "approved" : "pending",
      }),
    };
  };
  try {
    let value;
    const res = {
      json: (data) => {
        value = data;
      },
    };
    const phone = "09179999001";
    await controller.send(
      { body: { phone }, headers: {}, socket: { remoteAddress: "127.0.0.1" } },
      res,
    );
    assert.equal(value.retryAfter, 60);
    assert.equal(calls[0].values.get("To"), "+639179999001");
    assert.equal(calls[0].values.get("Channel"), "sms");
    await controller.check({ body: { phone, code: "123456" } }, res);
    assert(value.ticket);
    assert(controller.verifiedPhone(phone, value.ticket));
    assert(!controller.verifiedPhone("09179999002", value.ticket));
    assert(!controller.verifiedPhone(phone, "invalid"));
  } finally {
    global.fetch = originalFetch;
    for (const key of [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_VERIFY_SERVICE_SID",
    ]) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
});
