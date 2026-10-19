// Isolated SMTP sink for automated tests; never imported by the application.
const net = require('node:net');
const http = require('node:http');
async function startTestMail() {
  const messages = [], sockets = new Set();
  const smtp = net.createServer(socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.on('error', () => {});
    socket.write('220 localhost FurPaws test SMTP\r\n');
    let buffer = '', data = false, lines = [], to = '';
    socket.on('data', chunk => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { messages.push({ to, raw: lines.join('\n') }); data = false; lines = []; socket.write('250 message accepted\r\n'); }
          else lines.push(line.startsWith('..') ? line.slice(1) : line);
          continue;
        }
        if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 PIPELINING\r\n');
        else if (/^RCPT TO:/i.test(line)) {
          to = (line.match(/<([^>]+)>/) || [])[1] || '';
          socket.write(to === 'delivery-failure@example.test' ? '550 test recipient rejected\r\n' : '250 recipient ok\r\n');
        } else if (/^DATA$/i.test(line)) { data = true; lines = []; socket.write('354 send message\r\n'); }
        else if (/^QUIT$/i.test(line)) { socket.end('221 bye\r\n'); }
        else socket.write('250 ok\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
  const mailbox = http.createServer((req, res) => {
    const email = new URL(req.url, 'http://localhost').searchParams.get('email');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(messages.filter(message => message.to === email)));
  });
  await new Promise(resolve => mailbox.listen(0, '127.0.0.1', resolve));
  return {
    env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtp.address().port), SMTP_SECURE: 'false', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: 'FurPaws <no-reply@furpaws.test>', TEST_MAILBOX_URL: `http://127.0.0.1:${mailbox.address().port}` },
    async close() { for (const socket of sockets) socket.destroy(); mailbox.closeAllConnections(); await Promise.all([new Promise(r => smtp.close(r)), new Promise(r => mailbox.close(r))]); },
  };
}
module.exports = { startTestMail };
