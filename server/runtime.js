const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { exec: execCb } = require('child_process');
const { promisify } = require('util');
const { config, isValidPort } = require('./config');

const exec = promisify(execCb);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomName = () =>
  Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');

const dir = config.filePath;
const names = { npm: randomName(), web: randomName(), bot: randomName(), php: randomName() };
const bin = {
  npm: path.join(dir, names.npm),
  php: path.join(dir, names.php),
  web: path.join(dir, names.web),
  bot: path.join(dir, names.bot),
};
const files = {
  bootLog: path.join(dir, 'boot.log'),
  xrayConfig: path.join(dir, 'config.json'),
  tunnelJson: path.join(dir, 'tunnel.json'),
  tunnelYml: path.join(dir, 'tunnel.yml'),
  nezhaYaml: path.join(dir, 'config.yaml'),
  cert: path.resolve(dir, 'cert.pem'),
  key: path.resolve(dir, 'private.key'),
};

const nezhaEnabled = Boolean(config.nezhaServer && config.nezhaKey);
const argoFixed = Boolean(config.argoAuth && config.argoDomain);

function prepareFiles() {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    const target = path.join(dir, entry);
    try {
      if (fs.statSync(target).isFile()) fs.unlinkSync(target);
    } catch (e) {
      // ignore files that cannot be removed
    }
  }
}

function generateRealityKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64url'),
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64url'),
  };
}

function prepareTunnelConfig() {
  if (!argoFixed || !config.argoAuth.includes('TunnelSecret')) return;
  const tunnelId = JSON.parse(config.argoAuth).TunnelID;
  fs.writeFileSync(files.tunnelJson, config.argoAuth);
  fs.writeFileSync(files.tunnelYml, [
    `tunnel: ${tunnelId}`,
    `credentials-file: ${files.tunnelJson}`,
    'protocol: http2',
    '',
    'ingress:',
    `  - hostname: ${config.argoDomain}`,
    `    service: http://localhost:${config.argoPort}`,
    '    originRequest:',
    '      noTLSVerify: true',
    '  - service: http_status:404',
    '',
  ].join('\n'));
}

function writeXrayConfig(realityKeys) {
  const uuid = config.uuid;
  const xrayConfig = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      {
        tag: 'vless-fallback-in',
        port: config.argoPort,
        listen: '::',
        protocol: 'vless',
        settings: {
          clients: [{ id: uuid, flow: 'xtls-rprx-vision' }],
          decryption: 'none',
          fallbacks: [
            { dest: config.port },
            { path: '/vless-argo', dest: 3002 },
            { path: '/vmess-argo', dest: 3003 },
            { path: '/trojan-argo', dest: 3004 },
          ],
        },
        streamSettings: { network: 'tcp' },
      },
      {
        tag: 'vless-tcp-in',
        port: 3001,
        listen: '127.0.0.1',
        protocol: 'vless',
        settings: { clients: [{ id: uuid }], decryption: 'none' },
        streamSettings: { network: 'tcp', security: 'none' },
      },
      {
        tag: 'vless-ws-in',
        port: 3002,
        listen: '127.0.0.1',
        protocol: 'vless',
        settings: { clients: [{ id: uuid, level: 0 }], decryption: 'none' },
        streamSettings: { network: 'ws', security: 'none', wsSettings: { path: '/vless-argo' } },
        sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false },
      },
      {
        tag: 'vmess-ws-in',
        port: 3003,
        listen: '127.0.0.1',
        protocol: 'vmess',
        settings: { clients: [{ id: uuid, alterId: 0 }] },
        streamSettings: { network: 'ws', wsSettings: { path: '/vmess-argo' } },
        sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false },
      },
      {
        tag: 'trojan-ws-in',
        port: 3004,
        listen: '127.0.0.1',
        protocol: 'trojan',
        settings: { clients: [{ password: uuid }] },
        streamSettings: { network: 'ws', security: 'none', wsSettings: { path: '/trojan-argo' } },
        sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false },
      },
    ],
    dns: { servers: ['https+local://8.8.8.8/dns-query'] },
    outbounds: [{ protocol: 'freedom', tag: 'direct' }, { protocol: 'blackhole', tag: 'block' }],
  };

  if (isValidPort(config.realityPort)) {
    xrayConfig.inbounds.push({
      tag: 'vless-in',
      listen: '::',
      port: parseInt(config.realityPort, 10),
      protocol: 'vless',
      settings: { clients: [{ id: uuid, flow: 'xtls-rprx-vision' }], decryption: 'none' },
      streamSettings: {
        network: 'raw',
        security: 'reality',
        realitySettings: {
          show: false,
          dest: 'www.iij.ad.jp:443',
          xver: 0,
          serverNames: ['www.iij.ad.jp'],
          privateKey: realityKeys.privateKey,
          shortIds: [''],
        },
      },
    });
  }

  if (isValidPort(config.hy2Port)) {
    xrayConfig.inbounds.push({
      tag: 'hysteria-in',
      listen: '::',
      port: parseInt(config.hy2Port, 10),
      protocol: 'hysteria',
      settings: { version: 2, clients: [{ auth: uuid }] },
      streamSettings: {
        network: 'hysteria',
        hysteriaSettings: {
          version: 2,
          masquerade: { type: 'proxy', url: 'https://bing.com' },
        },
        security: 'tls',
        tlsSettings: {
          alpn: ['h3'],
          certificates: [{ certificateFile: files.cert, keyFile: files.key }],
        },
      },
    });
  }

  if (isValidPort(config.s5Port)) {
    xrayConfig.inbounds.push({
      tag: 's5-in',
      listen: '::',
      port: parseInt(config.s5Port, 10),
      protocol: 'socks',
      settings: {
        auth: 'password',
        accounts: [{ user: uuid.substring(0, 8), pass: uuid.slice(-12) }],
        udp: true,
      },
    });
  }

  fs.writeFileSync(files.xrayConfig, JSON.stringify(xrayConfig, null, 2));
}

function getDownloadList() {
  const arch = ['arm', 'arm64', 'aarch64'].includes(os.arch()) ? 'arm' : 'amd';
  const baseUrl = arch === 'arm' ? 'https://arm64.oooen.com' : 'https://amd64.oooen.com';
  const backupUrl = arch === 'arm' ? 'https://arm64.ssss.nyc.mn' : 'https://amd64.ssss.nyc.mn';
  const list = [
    { target: bin.web, urls: [`${baseUrl}/web`, `${backupUrl}/web`] },
    { target: bin.bot, urls: [`${baseUrl}/bot`, `${backupUrl}/bot`] },
  ];
  if (nezhaEnabled) {
    list.unshift(config.nezhaPort
      ? { target: bin.npm, urls: [`${baseUrl}/agent`, `${backupUrl}/agent`] }
      : { target: bin.php, urls: [`${baseUrl}/v1`, `${backupUrl}/v1`] });
  }
  return list;
}

async function downloadWithFallback(target, urls) {
  let lastError = 'no source';
  for (const url of urls) {
    const tempPath = `${target}.download`;
    try {
      const response = await fetch(url);
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tempPath));
      fs.renameSync(tempPath, target);
      console.log(`Download ${path.basename(target)} successfully`);
      return;
    } catch (err) {
      lastError = err.message;
      fs.rmSync(tempPath, { force: true });
      console.log(`Download ${path.basename(target)} from ${url} failed: ${lastError}`);
    }
  }
  throw new Error(`Download ${path.basename(target)} failed: ${lastError}`);
}

async function downloadBinaries() {
  const list = getDownloadList();
  await Promise.all(list.map(({ target, urls }) => downloadWithFallback(target, urls)));
  for (const { target } of list) {
    fs.chmodSync(target, 0o775);
  }
}

async function runDetached(command) {
  await exec(`nohup ${command} >/dev/null 2>&1 &`);
  await sleep(1000);
}

function tunnelArgs() {
  if (argoFixed && /^[A-Z0-9a-z=]{120,250}$/.test(config.argoAuth)) {
    return `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${config.argoAuth}`;
  }
  if (argoFixed && config.argoAuth.includes('TunnelSecret')) {
    return `tunnel --edge-ip-version auto --config "${path.resolve(files.tunnelYml)}" run`;
  }
  return `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile "${path.resolve(files.bootLog)}" --loglevel info --url http://localhost:${config.argoPort}`;
}

async function startBot() {
  await runDetached(`"${path.resolve(bin.bot)}" ${tunnelArgs()}`);
}

async function startNezha() {
  if (config.nezhaPort) {
    const tls = ['443', '8443', '2096', '2087', '2083', '2053'].includes(config.nezhaPort) ? '--tls' : '';
    await runDetached(`${bin.npm} -s ${config.nezhaServer}:${config.nezhaPort} -p ${config.nezhaKey} ${tls} --disable-auto-update --report-delay 4 --skip-conn --skip-procs`);
    return;
  }
  const port = config.nezhaServer.includes(':') ? config.nezhaServer.split(':').pop() : '';
  const nezhaTls = ['443', '8443', '2096', '2087', '2083', '2053'].includes(port);
  fs.writeFileSync(files.nezhaYaml, [
    `client_secret: ${config.nezhaKey}`,
    'debug: false',
    'disable_auto_update: true',
    'disable_command_execute: false',
    'disable_force_update: true',
    'disable_nat: false',
    'disable_send_query: false',
    'gpu: false',
    'insecure_tls: true',
    'ip_report_period: 1800',
    'report_delay: 4',
    `server: ${config.nezhaServer}`,
    'skip_connection_count: true',
    'skip_procs_count: true',
    'temperature: false',
    `tls: ${nezhaTls}`,
    'use_gitee_to_upgrade: false',
    'use_ipv6_country_code: false',
    `uuid: ${config.uuid}`,
    '',
  ].join('\n'));
  await runDetached(`${bin.php} -c "${files.nezhaYaml}"`);
}

async function launchServices() {
  if (nezhaEnabled) await startNezha();
  await runDetached(`${bin.web} -c ${files.xrayConfig}`);
  if (fs.existsSync(bin.bot)) await startBot();
  await sleep(2000);
}

async function killBot() {
  const first = names.bot.charAt(0);
  await exec(`pkill -f "[${first}]${names.bot.substring(1)}" > /dev/null 2>&1`).catch(() => {});
}

function readQuickTunnelDomain() {
  try {
    const content = fs.readFileSync(files.bootLog, 'utf8');
    const match = content.match(/https?:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
}

async function waitForQuickTunnelDomain(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const domain = readQuickTunnelDomain();
    if (domain) return domain;
    await sleep(1000);
  }
  return '';
}

async function resolveArgoDomain() {
  if (argoFixed) return config.argoDomain;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const domain = await waitForQuickTunnelDomain(30000);
    if (domain) return domain;
    console.log(`Tunnel domain not found (attempt ${attempt}), restarting tunnel`);
    await killBot();
    fs.rmSync(files.bootLog, { force: true });
    await startBot();
    await sleep(3000);
  }
  return '';
}

function scheduleCleanup() {
  setTimeout(() => {
    const targets = [
      files.bootLog, files.xrayConfig, files.tunnelJson, files.tunnelYml,
      files.nezhaYaml, files.cert, files.key, bin.web, bin.bot,
    ];
    if (nezhaEnabled) targets.push(config.nezhaPort ? bin.npm : bin.php);
    for (const target of targets) fs.rmSync(target, { force: true });
  }, 90000);
}

module.exports = {
  files,
  prepareFiles,
  generateRealityKeys,
  prepareTunnelConfig,
  writeXrayConfig,
  downloadBinaries,
  launchServices,
  resolveArgoDomain,
  scheduleCleanup,
};
