const http = require('http');
const fs = require('fs');
const path = require('path');
const { config, isValidPort } = require('./config');
const { ensureTlsCertificates, getCertificateFingerprint } = require('./tls');
const runtime = require('./runtime');
const { getIspLabel, getServerIP, buildAccounts } = require('./links');

if (!config.showLog) {
  console.log = () => {};
  console.error = () => {};
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const state = {
  status: 'starting',
  message: 'Menyiapkan layanan...',
  argoDomain: '',
  accounts: [],
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveStatic(res, pathname) {
  let requested;
  try {
    requested = decodeURIComponent(pathname);
  } catch (e) {
    sendText(res, 400, 'Bad Request');
    return;
  }
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
  const filePath = path.resolve(config.distPath, relative);
  if (!filePath.startsWith(config.distPath + path.sep)) {
    sendText(res, 404, 'Not Found');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 404, 'Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(data);
  });
}

function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/api/accounts') {
    sendJson(res, 200, {
      status: state.status,
      message: state.message,
      argoDomain: state.argoDomain,
      accounts: state.accounts,
    });
    return;
  }
  serveStatic(res, pathname);
}

async function sendTelegram(accounts) {
  if (!config.botToken || !config.chatId) return;
  try {
    const text = accounts.map((account) => `${account.protocol}: ${account.link}`).join('\n');
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.chatId, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message);
  }
}

async function keepAlive() {
  if (!config.autoAccess || !config.projectUrl) return;
  try {
    await fetch('https://oooo.serv00.net/add-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: config.projectUrl }),
      signal: AbortSignal.timeout(10000),
    });
    console.log('Automatic access task added successfully');
  } catch (error) {
    console.error(`Add automatic access task failed: ${error.message}`);
  }
}

async function startup() {
  try {
    runtime.prepareFiles();
    runtime.scheduleCleanup();
    if (isValidPort(config.hy2Port)) ensureTlsCertificates(runtime.files.cert, runtime.files.key);
    runtime.prepareTunnelConfig();
    const realityKeys = runtime.generateRealityKeys();
    runtime.writeXrayConfig(realityKeys);

    await runtime.downloadBinaries();
    await runtime.launchServices();

    const argoDomain = await runtime.resolveArgoDomain();
    if (!argoDomain) throw new Error('Tunnel domain could not be obtained');

    const [isp, serverIP] = await Promise.all([getIspLabel(), getServerIP()]);
    const certFingerprint = isValidPort(config.hy2Port) ? getCertificateFingerprint(runtime.files.cert) : '';

    state.accounts = buildAccounts({
      argoDomain,
      serverIP,
      isp,
      realityPublicKey: realityKeys.publicKey,
      certFingerprint,
    });
    state.argoDomain = argoDomain;
    state.status = 'ready';
    state.message = 'Akun siap digunakan';

    await sendTelegram(state.accounts);
    await keepAlive();
  } catch (error) {
    state.status = 'error';
    state.message = 'Layanan gagal dimulai. Periksa domain dan token Argo, lalu jalankan ulang.';
    console.error('Startup failed:', error);
  }
}

http.createServer(handleRequest).listen(config.port, () => {
  console.log(`http server is running on ${config.port}!`);
});

startup();
