// An isolated classroom demo. It never connects to the Atlas/real clinic database.
const path = require('path');
const fs = require('fs');
const { spawnSync, spawn } = require('child_process');
const mongoose = require('mongoose');
const root = path.resolve(__dirname, '..');
const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27018/furpaws_demo?replicaSet=rs0';
if (!/^(mongodb:\/\/)(127\.0\.0\.1|localhost)(:|\/)/.test(localUri)) throw new Error('Demo mode requires local MongoDB; Atlas is never modified.');
const uri = new URL(localUri);
uri.pathname = '/furpaws_demo';
process.env.MONGODB_URI = uri.toString();
process.env.JWT_SECRET = 'FurPaws-isolated-classroom-demo-only-secret';
process.env.PORT = process.env.DEMO_PORT || '4500';
process.env.CLIENT_ORIGIN = `http://127.0.0.1:${process.env.PORT}`;
delete process.env.VERCEL;
for(const key of ["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_VERIFY_SERVICE_SID"])process.env[key]="";
async function main() {
  if (!fs.existsSync(path.join(root, 'client/build/index.html'))) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
    if (build.status) throw new Error('Build the frontend before starting the demo.');
  }
  const seed = spawnSync(process.execPath, ['server/seed.js'], { cwd: root, env: process.env, stdio: 'inherit' });
  if (seed.status) throw new Error('Start local MongoDB with npm run db:start, then try again.');
  await mongoose.connect(process.env.MONGODB_URI);
  const { User, Pet, Appointment, Service, Schedule } = require('../server/models');
  const { today } = require('../server/utils/core');
  const date = today();
  const owner = await User.findOne({ email: 'ava@furpaws.test' });
  const admin = await User.findOne({ role: 'ADMIN' });
  const pet = await Pet.findOne({ owner: owner._id, status: 'Approved' });
  const service = await Service.findOne({ name: 'Consultation' });
  const schedule = await Schedule.findOne({ key: 'clinic' });
  for (const field of ['blockedDates', 'holidays', 'leaveDates']) schedule[field] = schedule[field].filter(value => value !== date);
  const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  const hours = schedule.hours.find(({ day }) => day === weekday);
  Object.assign(hours, { closed: false, open: '00:00', close: '23:59' });
  await schedule.save();
  if (!await Appointment.exists({ date, status: 'Approved', service: service._id })) {
    await Appointment.create({ owner: owner._id, pet: pet._id, service: service._id, admin: admin._id, date, time: '09:00', bookingType: 'With record', status: 'Approved', reasonForVisit: 'Classroom demo: owner reports mild scratching and would like a checkup.' });
  }
  await mongoose.disconnect();
  const { start } = require('../server/server');
  const server = await start();
  console.log(`\nISOLATED DEMO: http://127.0.0.1:${process.env.PORT}/login\nDatabase: furpaws_demo (local only)\nAdmin: admin@furpaws.test | Owner: ava@furpaws.test\nDemo password: FurPaws123\nToday’s Queue includes an Approved visit. Live clinic records are unchanged.\n`);
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Demo port is in use. Close the earlier demo or set DEMO_PORT.' : error.message); process.exitCode = 1; });
  const stop = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  if (!process.argv.includes('--no-open')) {
    const url = `http://127.0.0.1:${process.env.PORT}/login`;
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const opener = spawn(command, args, { stdio: 'ignore' });opener.on('error', () => console.log(`Open ${url} in your browser.`));
  }
}
main().catch(async error => { console.error(error.message); await mongoose.disconnect(); process.exitCode = 1; });
