const test = require('node:test'), assert = require('node:assert/strict'), mongoose = require('mongoose'), { randomUUID } = require('node:crypto');
const request = async (path, token, body, method = body ? 'POST' : 'GET') => {
  const r = await fetch(process.env.API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, data: await r.json() };
};
test('Permanent appointment sequence, owner daily limit and dedicated emergency service', async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const { Appointment, Service, Counter } = require('../server/models');
  try {
    const login = async email => (await request('/auth/login', null, { email, password: 'FurPaws123' })).data.token;
    const owner = await login('ava@furpaws.test'), other = await login('noah@furpaws.test'), admin = await login('admin@furpaws.test');
    const service = await Service.findOne({ name: 'Consultation' });
    const day = new Date(); day.setUTCDate(day.getUTCDate() + 320); while ([0,6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate()+1);
    const date = day.toISOString().slice(0,10);
    const body = (name,time='09:00',visitDate=date) => ({ bookingType:'No record',date:visitDate,time,service:String(service._id),reasonForVisit:'Isolated test: owner reports reduced appetite and scratching.',registration:{name:'Tracking '+name,species:'Dog',breed:'Mixed breed',birthDate:'2025-01-01'} });
    const a = await request('/appointments',owner,body('first'));assert.equal(a.status,201);assert(a.data.appointmentNumber>0);assert(a.data.createdAt);
    const b = await request('/appointments',owner,body('another pet','09:30'));assert.equal(b.status,409);assert.match(b.data.message,/one|already/i);
    const slots = await request('/appointments/slots?date='+date,owner);assert.equal(slots.data.ownerDailyLimitReached,true);assert(slots.data.slots.every(s=>s.status==='Full'));
    assert.equal((await request(`/appointments/${a.data._id}/decision`,admin,{status:'Approved'})).status,200);
    assert.equal((await request('/appointments',owner,body('after approval','10:00'))).status,409);
    const c = await request('/appointments',other,body('different owner','09:30'));assert.equal(c.status,201);assert.equal(c.data.appointmentNumber,a.data.appointmentNumber+1);
    assert.equal((await request(`/appointments/${a.data._id}`,owner,{status:'Cancelled',cancellationReason:'Cannot attend; booking another available time.'},'PATCH')).status,200);
    const d = await request('/appointments',owner,body('replacement','10:00'));assert.equal(d.status,201);assert(d.data.appointmentNumber>c.data.appointmentNumber);
    const next = new Date(day);next.setUTCDate(next.getUTCDate()+7);const nextDate=next.toISOString().slice(0,10);
    const race=await Promise.all(['11:00','11:30'].map((time,i)=>request('/appointments',owner,body('concurrent '+i,time,nextDate))));assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
    const emergency=await request('/consultations/emergency',admin,{requestId:randomUUID(),reasonForVisit:'Isolated emergency intake test.',registration:{name:'Tracking emergency',species:'Dog',breed:'Mixed breed',birthDate:'2025-01-01'},contact:{name:'Tracking guest'}});assert.equal(emergency.status,201);assert(emergency.data.appointmentNumber>d.data.appointmentNumber);
    const emergencyService=await Service.findById(emergency.data.service);assert.equal(emergencyService.name,'Emergency');assert.equal(emergencyService.type,'Emergency');assert.equal(emergencyService.fee,service.fee);
    const ownerServices=await request('/services',owner);assert(!ownerServices.data.some(s=>s.type==='Emergency'));
    const count=await Counter.findById('appointments');
    const oldDate=new Date('2020-01-01T00:00:00.000Z');const legacy=(await Appointment.collection.insertOne({...Object.fromEntries(Object.entries(a.data).filter(([key])=>!['_id','appointmentNumber','__v'].includes(key))),owner:new mongoose.Types.ObjectId(a.data.owner),pet:new mongoose.Types.ObjectId(a.data.pet),service:service._id,createdAt:oldDate})).insertedId;
    const backfill=require('../server/utils/appointmentNumbers').backfillAppointmentNumbers;await backfill();const upgraded=await Appointment.findById(legacy);assert(upgraded.appointmentNumber>count.value);assert.equal(upgraded.createdAt.valueOf(),oldDate.valueOf());const number=upgraded.appointmentNumber;await backfill();assert.equal((await Appointment.findById(legacy)).appointmentNumber,number);
    const numbers=(await Appointment.find({appointmentNumber:{$gt:0}}).lean()).map(a=>a.appointmentNumber);assert.equal(new Set(numbers).size,numbers.length);
  } finally { await mongoose.disconnect(); }
});
