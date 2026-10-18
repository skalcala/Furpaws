const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {Notification} = require('../server/models');
const base = process.env.API_BASE || 'http://127.0.0.1:4000/api';
async function request(path, token, body, method = body ? 'PATCH' : 'GET') {
  const res = await fetch(base + path, {method, headers: {'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
  return {status:res.status, data:await res.json()};
}
after(()=>mongoose.disconnect());
test('Profile photo persists only on own account; bulk notification reads are scoped to recipient and audience', async()=>{
  const uri = new URL(process.env.MONGODB_URI);
  assert(['127.0.0.1','localhost'].includes(uri.hostname), 'Use the isolated local workflow runner');
  await mongoose.connect(uri.toString());
  const login = async email => (await request('/auth/login', null, {email,password:'FurPaws123'}, 'POST')).data;
  const owner = await login('ava@furpaws.test'), other = await login('noah@furpaws.test'), admin = await login('admin@furpaws.test');
  const picture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const saved = await request('/users/me', owner.token, {profilePicture:picture});
  assert.equal(saved.status,200); assert.equal(saved.data.profilePicture,picture);
  assert.equal((await request('/users/me',owner.token)).data.profilePicture,picture);
  assert.notEqual((await request('/users/me',other.token)).data.profilePicture,picture);
  assert.equal((await request('/users/me',owner.token,{profilePicture:'javascript:alert(1)'})).status,400);
  assert.equal((await request('/users/me',owner.token,{profilePicture:'data:image/png;base64,'+'A'.repeat(400000)})).status,400);
  const docs=await Notification.create([
    {owner:owner.user._id,audience:'OWNER',title:'Own update',message:'Own message'},
    {owner:other.user._id,audience:'OWNER',title:'Other update',message:'Other message'},
    {owner:admin.user._id,audience:'ADMIN',title:'Admin inbox',message:'Admin message'},
  ]);
  assert.equal((await request('/notifications/read-all',null,{})).status,401);
  assert.equal((await request('/notifications/read-all',owner.token,{owner:other.user._id})).status,400);
  assert.equal((await request('/notifications/read-all',owner.token,{})).status,200);
  assert.equal((await Notification.findById(docs[0]._id)).read,true);
  assert.equal((await Notification.findById(docs[1]._id)).read,false);
  assert.equal((await Notification.findById(docs[2]._id)).read,false);
  assert.equal((await request('/notifications/read-all',admin.token,{})).status,200);
  assert.equal((await Notification.findById(docs[2]._id)).read,true);
  assert.equal((await Notification.findById(docs[1]._id)).read,false);
  assert.equal((await request('/users/me',owner.token,{profilePicture:''})).data.profilePicture,'');
});
