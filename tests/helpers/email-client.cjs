const assert = require('node:assert/strict');
async function latestCode(email, mailbox = process.env.TEST_MAILBOX_URL) {
  assert(mailbox?.startsWith('http://127.0.0.1:'), 'Use the isolated SMTP test sink');
  const messages = await (await fetch(mailbox + '?email=' + encodeURIComponent(email.toLowerCase()))).json();
  const code = messages.at(-1)?.raw.match(/Your FurPaws code is: (\d{6})/)?.[1];
  assert(code, 'Expected an email in the local test mailbox'); return code;
}
async function emailTicket(email, purpose = 'register', token) {
  const request = async (path, body) => {
    const response = await fetch(process.env.API_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    assert.equal(response.status, 200, 'Email verification API request should succeed'); return response.json();
  };
  const endpoint = purpose === 'email-change' ? '/users/me/email' : '/auth/email', base = { email, ...(purpose === 'email-change' ? {} : { purpose }) };
  const sent = await request(endpoint + '/send', base);
  const checked = await request(endpoint + '/check', { ...base, challengeId: sent.challengeId, code: await latestCode(email) });
  return checked.ticket;
}
module.exports = { latestCode, emailTicket };
