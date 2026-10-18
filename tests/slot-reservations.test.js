const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const base = process.env.API_BASE;
const request = async (path, token, body, method = body ? 'POST' : 'GET') => {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
};
test('Half-hour slots reserve one place while Pending, release on cancellation and serialize competing bookings', async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Appointment, Schedule, Pet, User, Service } = require('../server/models');
  const admin = (await request('/auth/login', null, { email: 'admin@furpaws.test', password: 'FurPaws123' })).data.token;
  const tokens = await Promise.all(['ava@furpaws.test', 'noah@furpaws.test'].map(async email => (await request('/auth/login', null, { email, password: 'FurPaws123' })).data.token));
  const schedule = await Schedule.findOne({ key: 'clinic' }).lean();
  const service = await Service.findOne({ name: 'Consultation' });
  let day = new Date(); day.setUTCDate(day.getUTCDate() + 220);
  while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  const date = day.toISOString().slice(0, 10);
  try {
    // Existing installations may still store the old capacity and sparse time list.
    await Schedule.collection.updateOne({ _id: schedule._id }, { $set: { capacity: 3, times: ['09:00', '10:30'] } });
    const preview = await request('/appointments/slots?date=' + date, tokens[0]);
    assert.equal(preview.data.capacity, 1); assert.equal(preview.data.intervalMinutes, 30);
    assert(preview.data.slots.some(slot => slot.time === '09:30'));
    assert(preview.data.slots.some(slot => slot.time === '10:00'));
    for (let i = 1; i < preview.data.slots.length; i++) {
      const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      assert.equal(minutes(preview.data.slots[i].time) - minutes(preview.data.slots[i - 1].time), 30);
    }
    const body = i => ({ bookingType: 'No record', date, time: '09:30', service: String(service._id), reasonForVisit: 'Owner reports reduced appetite and scratching for three days.', registration: { name: `Reserved slot ${Date.now()} ${i}`, species: 'Dog', breed: 'Mixed breed', birthDate: '2025-01-01' } });
    const first = await request('/appointments', tokens[0], body(1)); assert.equal(first.status, 201);
    const reserved = await request('/appointments/slots?date=' + date, tokens[1]);
    assert.equal(reserved.data.slots.find(slot => slot.time === '09:30').status, 'Full');
    const blocked = await request('/appointments', tokens[1], body(2)); assert.equal(blocked.status, 409);
    const ownPreview = await request(`/appointments/slots?date=${date}&excludeId=${first.data._id}`, admin);
    assert.equal(ownPreview.data.slots.find(slot => slot.time === '09:30').status, 'Available');
    assert.equal((await request(`/appointments/${first.data._id}`, tokens[0], { status: 'Cancelled', cancellationReason: 'Owner cannot attend this appointment.' }, 'PATCH')).status, 200);
    assert.equal((await request('/appointments/slots?date=' + date, tokens[1])).data.slots.find(slot => slot.time === '09:30').status, 'Available');
    const competing = await Promise.all(tokens.map((token, i) => request('/appointments', token, body(3 + i))));
    assert.deepEqual(competing.map(result => result.status).sort(), [201, 409]);
    const intervalRejected = await request('/appointments', tokens[0], { ...body(6), time: '09:45' }); assert.equal(intervalRejected.status, 409);
    const capacityChange = await request(`/schedules/${schedule._id}`, admin, { capacity: 2 }, 'PATCH'); assert.equal(capacityChange.status, 400);
    assert.equal(await Appointment.countDocuments({ date, time: '09:30', status: { $in: ['Pending', 'Approved', 'Completed'] } }), 1);
  } finally {
    await Schedule.collection.updateOne({ _id: schedule._id }, { $set: { capacity: schedule.capacity, times: schedule.times } });
    await mongoose.disconnect();
  }
});
