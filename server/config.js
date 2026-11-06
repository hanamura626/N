const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const env = process.env;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const dataPath = env.DATA_PATH || path.join(__dirname, 'data');
const uuidFile = path.join(dataPath, 'uuid.txt');

function resolveUUID() {
  const fromEnv = (env.UUID || '').trim();
  if (UUID_PATTERN.test(fromEnv)) return fromEnv;

  try {
    const saved = fs.readFileSync(uuidFile, 'utf8').trim();
    if (UUID_PATTERN.test(saved)) return saved;
  } catch (e) {
    // no saved UUID yet
  }

  const uuid = crypto.randomUUID();
  try {
    fs.mkdirSync(dataPath, { recursive: true });
    fs.writeFileSync(uuidFile, uuid);
  } catch (e) {
    console.error(`[UUID] Failed to save UUID file: ${e.message}`);
  }
  return uuid;
}

const isValidPort = (port) => {
  const num = parseInt(port, 10);
  return Number.isInteger(num) && num >= 1 && num <= 65535 && String(port).trim() !== '';
};

const config = {
  uuid: resolveUUID(),
  filePath: env.FILE_PATH || '.npm',
  distPath: path.join(__dirname, '..', 'dist'),
  port: Number(env.SERVER_PORT || env.PORT || 3000),
  nodeName: env.NAME || '',
  argoDomain: env.ARGO_DOMAIN || '',
  argoAuth: env.ARGO_AUTH || '',
  argoPort: Number(env.ARGO_PORT || 8001),
  s5Port: env.S5_PORT || '',
  hy2Port: env.HY2_PORT || '',
  realityPort: env.REALITY_PORT || '',
  nezhaServer: env.NEZHA_SERVER || '',
  nezhaPort: env.NEZHA_PORT || '',
  nezhaKey: env.NEZHA_KEY || '',
  cfip: env.CFIP || 'saas.sin.fan',
  cfport: Number(env.CFPORT || 443),
  projectUrl: env.PROJECT_URL || '',
  autoAccess: ['true', 'yes', '1'].includes((env.AUTO_ACCESS || '').toLowerCase()),
  botToken: env.BOT_TOKEN || '',
  chatId: env.CHAT_ID || '',
  showLog: !['false', 'disable', 'no'].includes((env.SHOW_LOG || 'true').toLowerCase()),
};

module.exports = { config, isValidPort };
