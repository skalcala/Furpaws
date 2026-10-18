const { test, after } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config({ path: require("path").join(__dirname, "../server/.env") });
const mongoose = require("mongoose");
const base = process.env.API_BASE || "http://127.0.0.1:4000/api";
const request = async (
  path,
  { token, body, method = body ? "POST" : "GET" } = {},
) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: res.status,
    data: res.status === 204 ? null : await res.json(),
  };
};
after(async () => {
  await mongoose.disconnect();
});
test("Clinic flow, authorization, capacity, retired prescription rejection, and atomic completion", async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const {
    Appointment,
    Pet,
    Consultation,
    Bill,
    Medicine,
    AuditLog,
    Schedule,
  } = require("../server/models");
  const ownerLogin = await request("/auth/login", {
    body: { email: "ava@furpaws.test", password: "FurPaws123" },
  });
  assert.equal(ownerLogin.status, 200);
  const owner = ownerLogin.data.token;
  const admin = (
    await request("/auth/login", {
      body: { email: "admin@furpaws.test", password: "FurPaws123" },
    })
  ).data.token;
  const other = (
    await request("/auth/login", {
      body: { email: "noah@furpaws.test", password: "FurPaws123" },
    })
  ).data.token;
  assert.equal((await request("/pets")).status, 401);
  assert.equal((await request("/medicines", { token: owner })).status, 403);
  assert.equal(
    (await request("/appointments", { token: admin, body: {} })).status,
    403,
  );
  const pets = (await request("/pets", { token: owner })).data;
  assert.ok(
    pets.every(
      ({ status, owner: value }) =>
        status === "Approved" && value._id === ownerLogin.data.user._id,
    ),
  );
  assert.equal(
    (await request(`/pets/${pets[0]._id}/records`, { token: other })).status,
    404,
  );
  const services = (await request("/services", { token: owner })).data;
  const service = services.find(({ name }) => name === "Consultation");
  let date = new Date();
  date.setUTCDate(date.getUTCDate() + 10);
  while ([0, 6].includes(date.getUTCDay()))
    date.setUTCDate(date.getUTCDate() + 1);
  date = date.toISOString().slice(0, 10);
  const registration = {
    name: `Test ${Date.now()}`,
    species: "Cat",
    breed: "Domestic shorthair",
    birthDate: "2025-02-10",
    weight: 3.6,
  };
  const body = {
    reasonForVisit:
      "My pet has been scratching frequently for two days and needs a consultation.",
    bookingType: "No record",
    registration,
    date,
    time: "10:30",
    service: service._id,
  };
  assert.equal(
    (
      await request("/appointments", {
        token: owner,
        body: { ...body, date: "2020-01-01" },
      })
    ).status,
    409,
  );
  const created = await request("/appointments", { token: owner, body });
  assert.equal(created.status, 201);
  const id = created.data._id;
  const petId = created.data.pet;
  assert.equal((await request(`/pets/${petId}`, { token: owner })).status, 404);
  assert.equal(
    (
      await request(`/appointments/${id}/decision`, {
        token: owner,
        body: { status: "Approved" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/appointments/${id}/decision`, {
        token: admin,
        body: { status: "Declined", reason: "" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/consultations/complete", {
        token: admin,
        body: {
          appointment: id,
          weight: 4,
          diagnosis: "Test",
          symptoms: "Reported symptoms",
          treatment: "Test",
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/appointments/${id}/decision`, {
        token: admin,
        body: { status: "Approved" },
      })
    ).status,
    200,
  );
  assert.equal((await request(`/pets/${petId}`, { token: owner })).status, 200);
  assert.equal(
    (
      await request("/appointments", {
        token: owner,
        body: {
          reasonForVisit:
            "Follow-up after the previous visit; please check treatment progress and appetite.",
          bookingType: "With record",
          pet: petId,
          service: service._id,
          date,
          time: "10:30",
        },
      })
    ).status,
    409,
  );
  const meds = (await request("/medicines", { token: admin })).data;
  const med = meds.find(({ name }) => name === "Cephalexin 250 mg");
  const completion = {
    appointment: id,
    weight: 4.1,
    diagnosis: "Routine exam",
    symptoms: "Reported symptoms",
    treatment: "Monitor",
    notes: "Follow care instructions",
  };
  const rejected = await request("/consultations/complete", {token:admin,body:{...completion,prescriptions:[{medicine:med._id,quantity:2}]}});
  assert.equal(rejected.status,400);
  assert.equal((await Medicine.findById(med._id)).quantity,med.quantity);
  assert.equal((await Appointment.findById(id)).status,"Approved");
  assert.equal(await Bill.countDocuments({appointment:id}),0);
  const done = await request("/consultations/complete", {
    token: admin,
    body: completion,
  });
  assert.equal(done.status, 201);
  assert.equal(done.data.appointment.status, "Completed");
  assert.equal((await Medicine.findById(med._id)).quantity, med.quantity);
  assert.equal((await Pet.findById(petId)).weight, 4.1);
  assert.equal((await Pet.findById(petId)).weightHistory.length, 1);
  assert.equal(done.data.bill.total, service.fee);
  assert.equal(
    (
      await request("/consultations/complete", {
        token: admin,
        body: completion,
      })
    ).status,
    409,
  );
  assert.equal(await Consultation.countDocuments({ appointment: id }), 1);
  assert.equal(
    (
      await request(`/consultations/${done.data.consultation._id}`, {
        token: owner,
        method: "PATCH",
        body: { diagnosis: "Changed" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/bills/${done.data.bill._id}`, {
        token: admin,
        method: "PATCH",
        body: { status: "Paid", paymentMethod: "Cash" },
      })
    ).status,
    200,
  );
  assert.ok((await AuditLog.countDocuments({ record: id })) >= 3);
  const schedule = await Schedule.findOne({ key: "clinic" });
  const originalCapacity = schedule.capacity;
  schedule.capacity = 1;
  await schedule.save();
  try {
    const batch = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        request("/appointments", {
          token: owner,
          body: {
            ...body,
            time: "11:30",
            registration: {
              ...registration,
              name: `${registration.name} concurrent ${i}`,
            },
          },
        }),
      ),
    );
    assert.equal(batch.filter(({ status }) => status === 201).length, 1);
    assert.equal(batch.filter(({ status }) => status === 409).length, 2);
  } finally {
    await Schedule.updateOne(
      { _id: schedule._id },
      { capacity: originalCapacity },
    );
  }
  await Appointment.updateMany({ date, status: "Pending", pet: { $in: (await Pet.find({ name: new RegExp(`^${registration.name} concurrent`) })).map(p => p._id) } }, { status: "Cancelled" });
  const pending = await request("/appointments", {
    token: owner,
    body: {
      ...body,
      time: "09:00",
      registration: { ...registration, name: `${registration.name} declined` },
    },
  });
  assert.equal(pending.status, 201);
  assert.equal(
    (
      await request(`/appointments/${pending.data._id}/decision`, {
        token: admin,
        body: { status: "Declined", reason: "Admin unavailable" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await Appointment.findById(pending.data._id)).status,
    "Declined",
  );
  const notes = (await request("/notifications", { token: owner })).data;
  assert.ok(notes.some(({ message }) => message.includes("Admin unavailable")));
  // Remove only this test's fixtures; keep audit entries for verification.
  const testPets = await Pet.find({
    name: new RegExp(`^${registration.name}`),
  });
  const ids = testPets.map(({ _id }) => _id);
  await Appointment.deleteMany({ pet: { $in: ids } });
  await Consultation.deleteMany({ pet: { $in: ids } });
  await Bill.deleteMany({ pet: { $in: ids } });
  await require("../server/models").Notification.deleteMany({
    pet: { $in: ids },
  });
  await Pet.deleteMany({ _id: { $in: ids } });
});
