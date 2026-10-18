const test = require('node:test'), assert = require('node:assert/strict'), mongoose = require('mongoose');
const request = async (path, token, body) => { const r=await fetch(process.env.API_BASE+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()}; };
test('Future visit dates and atomic follow-up reservations, including vaccination returns',async()=>{
 await mongoose.connect(process.env.MONGODB_URI);
 const {Appointment,Consultation,Bill,Pet,Service,Vaccination}=require('../server/models');
 try{
  const login=async email=>(await request('/auth/login',null,{email,password:'FurPaws123'})).data.token;
  const owner=await login('ava@furpaws.test'),other=await login('noah@furpaws.test'),admin=await login('admin@furpaws.test');
  const vaccine=await Service.findOne({type:'Vaccination'}),general=await Service.findOne({name:'Consultation'});
  const day=new Date();day.setUTCDate(day.getUTCDate()+400);while([0,6].includes(day.getUTCDay()))day.setUTCDate(day.getUTCDate()+1);
  const date=day.toISOString().slice(0,10),returnDate=new Date(day.valueOf()+7*86400000).toISOString().slice(0,10),laterDate=new Date(day.valueOf()+14*86400000).toISOString().slice(0,10);
  const book=async(token,time,service,name,visitDate=date)=>{const r=await request('/appointments',token,{bookingType:'No record',date:visitDate,time,service:String(service._id),reasonForVisit:'Isolated clinical test visit with detailed owner observations.',registration:{name:'Return test '+name,species:'Dog',breed:'Mixed breed',birthDate:'2025-01-01'}});assert.equal(r.status,201);assert.equal((await request(`/appointments/${r.data._id}/decision`,admin,{status:'Approved'})).status,200);return r.data};
  const first=await book(owner,'09:00',vaccine,'vaccination');
  const done=await request('/consultations/complete',admin,{appointment:first._id,weight:4,vaccination:{vaccine:'Rabies',dateGiven:date,nextDueDate:returnDate},followUp:{enabled:true,date:returnDate,time:'09:00',purpose:'Recheck recovery',instructions:'Bring the visit record.'}});
  assert.equal(done.status,201);assert.equal(done.data.consultation.visitDate,date);assert.equal(done.data.followUpAppointment.date,returnDate);assert.equal(done.data.followUpAppointment.time,'09:00');assert.equal(done.data.followUpAppointment.status,'Approved');assert.notEqual(done.data.nextAppointment.time,'09:00');assert.equal(done.data.consultation.followUp.appointment,done.data.followUpAppointment._id);
  assert.equal((await Vaccination.findOne({consultation:done.data.consultation._id})).dateGiven.toISOString().slice(0,10),date);
  assert.equal((await Pet.findById(first.pet)).weightHistory.at(-1).date.toISOString(),new Date(`${date}T09:00:00+08:00`).toISOString());
  assert.equal((await request('/consultations/complete',admin,{appointment:first._id,weight:4})).status,409);
  const second=await book(owner,'09:30',general,'consultation');await book(other,'10:00',general,'reserved return',laterDate);
  const payload={appointment:second._id,weight:5,symptoms:'Test symptoms',diagnosis:'Test findings',prescription:'N/A',followUp:{enabled:true,date:laterDate,time:'10:00',purpose:'Recovery check'}};
  const blocked=await request('/consultations/complete',admin,payload);assert.equal(blocked.status,409);assert.equal(await Consultation.countDocuments({appointment:second._id}),0);assert.equal(await Bill.countDocuments({appointment:second._id}),0);assert.equal((await Appointment.findById(second._id)).status,'Approved');
  const saved=await request('/consultations/complete',admin,{...payload,followUp:{...payload.followUp,time:'10:30'}});assert.equal(saved.status,201);assert.equal(saved.data.followUpAppointment.time,'10:30');assert.equal((await Service.findById(saved.data.followUpAppointment.service)).type,'Consultation');
  const notes=(await request('/notifications',owner)).data;assert(notes.some(n=>String(n.appointment)===saved.data.followUpAppointment._id&&n.title==='Follow-up appointment booked'));
 }finally{await mongoose.disconnect()}
});
