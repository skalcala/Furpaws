const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { latestCode, emailTicket } = require('./helpers/email-client.cjs');
const request = async (path, body, token, method = body ? 'POST' : 'GET') => {
  const response = await fetch(process.env.API_BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
};
test('Email OTP verifies accounts and email changes; password reset is single-use, throttled and revokes old sessions', async () => {
  assert(['127.0.0.1', 'localhost'].includes(new URL(process.env.MONGODB_URI).hostname));
  await mongoose.connect(process.env.MONGODB_URI);
  const { EmailOtp, User, OtpLimit } = require('../server/models');
  try {
    const email = `email-qa-${randomUUID()}@example.test`, password = 'EmailTest123';
    const registration = { email, name: 'Email verification QA', phone: '09179999123', password };
    const config = await request('/auth/config'); assert.equal(config.data.emailOtpEnabled, true);
    assert.equal((await request('/auth/register', registration)).status, 400);
    assert.equal((await request('/auth/email/send', { email: 'invalid', purpose: 'register' })).status, 400);
    const sent = await request('/auth/email/send', { email: ' ' + email.toUpperCase() + ' ', purpose: 'register' }); assert.equal(sent.status, 200);
    const code = await latestCode(email); assert(!JSON.stringify(sent.data).includes(code));
    assert.equal((await request('/auth/email/send', { email, purpose: 'register' })).status, 429);
    const check = body => request('/auth/email/check', { email, purpose: 'register', challengeId: sent.data.challengeId, code, ...body });
    assert.equal((await check({ code: code === '000000' ? '111111' : '000000' })).status, 400);
    const verified = await check({}); assert.equal(verified.status, 200); assert(verified.data.ticket);
    assert.equal((await check({})).status, 400);
    const stored = await EmailOtp.findById(sent.data.challengeId).select('+codeHash'); assert.equal(stored.codeHash.length, 64); assert.notEqual(stored.codeHash, code);
    const created = await request('/auth/register', { ...registration, emailVerificationTicket: verified.data.ticket }); assert.equal(created.status, 201); assert.equal(created.data.emailVerified, true); assert(!created.data.passwordHash);
    assert.equal((await request('/auth/register', { ...registration, phone: '09179999124', emailVerificationTicket: verified.data.ticket })).status, 400);
    await OtpLimit.deleteMany({});
    const alreadyRegistered = await request('/auth/email/send', { email, purpose: 'register' });
    assert.equal(alreadyRegistered.status, 409); assert.match(alreadyRegistered.data.message, /already has a FurPaws account/); assert(!alreadyRegistered.data.challengeId);
    const signedIn = await request('/auth/login', { email, password }); assert.equal(signedIn.status, 200);
    const oldToken = signedIn.data.token;
    const missing = await request('/auth/email/send', { email: `absent-${randomUUID()}@example.test`, purpose: 'reset' });
    await OtpLimit.deleteMany({}); // Isolated test database: allow the same inbox to start a different flow immediately.
    const resetSent = await request('/auth/email/send', { email, purpose: 'reset' }); assert.equal(resetSent.status, missing.status); assert.equal(resetSent.data.message, missing.data.message); assert.deepEqual(Object.keys(resetSent.data).sort(), Object.keys(missing.data).sort());
    const resetCode = await latestCode(email);
    assert.equal((await request('/auth/email/check', { email, purpose: 'register', challengeId: resetSent.data.challengeId, code: resetCode })).status, 400);
    const resetCheck = await request('/auth/email/check', { email, purpose: 'reset', challengeId: resetSent.data.challengeId, code: resetCode }); assert.equal(resetCheck.status, 200);
    const resetBody = { email, password: 'NewEmailTest456', emailVerificationTicket: resetCheck.data.ticket };
    assert.equal((await request('/auth/password/reset', { ...resetBody, password: 'weak' })).status, 400);
    assert.equal((await request('/auth/password/reset', { ...resetBody, emailVerificationTicket: verified.data.ticket })).status, 400);
    const resets = await Promise.all([request('/auth/password/reset', resetBody), request('/auth/password/reset', resetBody)]); assert.deepEqual(resets.map(r => r.status).sort(), [200, 400]);
    assert.equal((await request('/auth/password/reset', resetBody)).status, 400);
    assert.equal((await request('/auth/login', { email, password })).status, 401);
    assert.equal((await request('/users/me', null, oldToken)).status, 401);
    const newLogin = await request('/auth/login', { email, password: resetBody.password }); assert.equal(newLogin.status, 200);
    const unknownReset = await request('/auth/password/reset', { ...resetBody, email: 'missing@example.test', emailVerificationTicket: 'invalid' });
    const knownReset = await request('/auth/password/reset', { ...resetBody, emailVerificationTicket: 'invalid' }); assert.equal(unknownReset.data.message, knownReset.data.message);
    // A verified address change is tied to the signed-in account and target inbox.
    const target = `changed-${randomUUID()}@example.test`, token = newLogin.data.token;
    assert.equal((await request('/users/me/email/send', { email: target })).status, 401);
    assert.equal((await request('/auth/email/send', { email: target, purpose: 'email-change' })).status, 400);
    const ticket = await emailTicket(target, 'email-change', token);
    assert.equal((await request('/users/me', { email: target }, token, 'PATCH')).status, 400);
    assert.equal((await request('/users/me', { email: 'different@example.test', emailVerificationTicket: ticket }, token, 'PATCH')).status, 400);
    const other = await request('/auth/login', { email: 'noah@furpaws.test', password: 'FurPaws123' });
    assert.equal((await request('/users/me', { email: target, emailVerificationTicket: ticket }, other.data.token, 'PATCH')).status, 400);
    const changed = await request('/users/me', { email: target, emailVerificationTicket: ticket }, token, 'PATCH'); assert.equal(changed.status, 200); assert.equal(changed.data.email, target); assert.equal(changed.data.emailVerified, true);
    // Five wrong codes lock the challenge, even if the correct code is later supplied.
    const lockedEmail = `locked-${randomUUID()}@example.test`;
    const locked = await request('/auth/email/send', { email: lockedEmail, purpose: 'register' }); const correct = await latestCode(lockedEmail);
    for (let i = 0; i < 5; i++) assert.equal((await request('/auth/email/check', { email: lockedEmail, purpose: 'register', challengeId: locked.data.challengeId, code: correct === '111111' ? '222222' : '111111' })).status, 400);
    assert.equal((await request('/auth/email/check', { email: lockedEmail, purpose: 'register', challengeId: locked.data.challengeId, code: correct })).status, 400);
    const expiryEmail = `expired-${randomUUID()}@example.test`, expiring = await request('/auth/email/send', { email: expiryEmail, purpose: 'register' });
    await EmailOtp.updateOne({ _id: expiring.data.challengeId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await request('/auth/email/check', { email: expiryEmail, purpose: 'register', challengeId: expiring.data.challengeId, code: await latestCode(expiryEmail) })).status, 400);
    const failure = await request('/auth/email/send', { email: 'delivery-failure@example.test', purpose: 'register' }); assert.equal(failure.status, 503);
    assert.equal((await EmailOtp.findOne({ email: 'delivery-failure@example.test' })).delivery, 'failed');
    // Resending invalidates an earlier verified ticket.
    const resendEmail = `resend-${randomUUID()}@example.test`, oldTicket = await emailTicket(resendEmail);
    await OtpLimit.deleteMany({});
    await request('/auth/email/send', { email: resendEmail, purpose: 'register' });
    const resendAttempt = await request('/auth/register', { ...registration, email: resendEmail, phone: '09179999126', emailVerificationTicket: oldTicket }); assert.equal(resendAttempt.status, 400);
    assert.equal(await User.countDocuments({ email: resendEmail }), 0);
  } finally { await mongoose.disconnect(); }
});
