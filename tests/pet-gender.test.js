const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const request = async (path, token, body, method = body ? 'POST' : 'GET') => {
  const response = await fetch(process.env.API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
};
test('Pet gender persists across booking, emergency intake, admin edits and medical records without guessing legacy values', async () => {
  const uri = new URL(process.env.MONGODB_URI);
  assert(['127.0.0.1', 'localhost'].includes(uri.hostname));
  await mongoose.connect(uri.toString());
  try {
    const { Pet, Service, Appointment } = require('../server/models');
    const login = async email => (await request('/auth/login', null, { email, password: 'FurPaws123' })).data.token;
    const owner = await login('ava@furpaws.test'), other = await login('noah@furpaws.test'), admin = await login('admin@furpaws.test');
    const service = await Service.findOne({ name: 'Consultation' });
    const day = new Date(); day.setUTCDate(day.getUTCDate() + 450); while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    const body = { bookingType: 'No record', date, time: '09:00', service: String(service._id), reasonForVisit: 'Test visit to verify patient registration and clinical details.', registration: { name: 'Gender QA pet', species: 'Dog', breed: 'Mixed breed', gender: 'Male', birthDate: '2025-01-01' } };
    for (const gender of ['Invalid', '', null, { name: 'Male' }]) {
      const rejected = await request('/appointments', owner, { ...body, registration: { ...body.registration, gender } });
      assert.equal(rejected.status, 400); assert(rejected.data.errors.gender);
    }
    assert.equal(await Pet.countDocuments({ name: body.registration.name }), 0);
    const booked = await request('/appointments', owner, body); assert.equal(booked.status, 201);
    assert.equal((await Pet.findById(booked.data.pet)).gender, 'Male');
    assert.equal((await request(`/appointments/${booked.data._id}/decision`, admin, { status: 'Approved' })).status, 200);
    assert.equal((await request('/appointments', owner)).data.find(row => row._id === booked.data._id).pet.gender, 'Male');
    assert.equal((await request(`/pets/${booked.data.pet}/records`, owner)).data.pet.gender, 'Male');
    assert.equal((await request(`/pets/${booked.data.pet}`, owner, { gender: 'Female' }, 'PATCH')).status, 400);
    assert.equal((await request(`/pets/${booked.data.pet}`, other, { gender: 'Female' }, 'PATCH')).status, 404);
    assert.equal((await request(`/pets/${booked.data.pet}`, admin, { gender: 'Invalid' }, 'PATCH')).status, 400);
    const updated = await request(`/pets/${booked.data.pet}`, admin, { gender: 'Female' }, 'PATCH'); assert.equal(updated.status, 200); assert.equal(updated.data.gender, 'Female');
    assert.equal((await request(`/pets/${booked.data.pet}`, owner)).data.gender, 'Female');
    const emergency = await request('/consultations/emergency', admin, { requestId: randomUUID(), reasonForVisit: 'Emergency registration gender persistence test.', registration: { name: 'Gender emergency patient', species: 'Cat', breed: 'Domestic shorthair', gender: 'Female' }, contact: { name: 'Gender test guest' } });
    assert.equal(emergency.status, 201); assert.equal((await Pet.findById(emergency.data.pet)).gender, 'Female');
    const invalidEmergency = await request('/consultations/emergency', admin, { requestId: randomUUID(), reasonForVisit: 'Emergency invalid gender validation test.', registration: { name: 'Invalid gender emergency', species: 'Dog', breed: 'Mixed breed', gender: 'Invalid' }, contact: { name: 'Gender test guest' } });
    assert.equal(invalidEmergency.status, 400); assert.equal(await Pet.countDocuments({ name: 'Invalid gender emergency' }), 0);
    // Simulate an old record with no stored gender. Reading must remain safe.
    await Pet.collection.updateOne({ _id: new mongoose.Types.ObjectId(booked.data.pet) }, { $unset: { gender: '' } });
    const legacy = await request(`/pets/${booked.data.pet}`, owner); assert.equal(legacy.status, 200); assert.equal(legacy.data.gender, 'Unknown');
    assert.equal((await request(`/pets/${booked.data.pet}`, admin, { gender: 'Male' }, 'PATCH')).status, 200);
    assert.equal((await Appointment.findById(booked.data._id)).status, 'Approved');
  } finally { await mongoose.disconnect(); }
});
