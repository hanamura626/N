const { config, isValidPort } = require('./config');

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.text()).trim();
}

async function getIspLabel() {
  try {
    const data = await fetchJson('https://api.ip.sb/geoip');
    if (data.country_code && data.isp) return `${data.country_code}-${data.isp}`.replace(/\s+/g, '_');
  } catch (e) {
    try {
      const data = await fetchJson('http://ip-api.com/json');
      if (data.status === 'success' && data.countryCode && data.org) {
        return `${data.countryCode}-${data.org}`.replace(/\s+/g, '_');
      }
    } catch (fallbackError) {
      // location is optional
    }
  }
  return 'Unknown';
}

async function getServerIP() {
  try {
    return await fetchText('http://ipv4.ip.sb');
  } catch (e) {
    try {
      return `[${await fetchText('http://ipv6.ip.sb')}]`;
    } catch (ipv6Error) {
      return '';
    }
  }
}

function buildAccounts({ argoDomain, serverIP, isp, realityPublicKey, certFingerprint }) {
  const uuid = config.uuid;
  const name = config.nodeName ? `${config.nodeName}-${isp}` : isp;
  const cfip = config.cfip;
  const cfport = config.cfport;

  const vmessPayload = {
    v: '2', ps: name, add: cfip, port: cfport, id: uuid, aid: '0', scy: 'auto',
    net: 'ws', type: 'none', host: argoDomain, path: '/vmess-argo?ed=2560',
    tls: 'tls', sni: argoDomain, alpn: '', fp: 'firefox',
  };

  const accounts = [
    {
      id: 'vless-argo',
      protocol: 'VLESS',
      name,
      link: `vless://${uuid}@${cfip}:${cfport}?encryption=none&security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Fvless-argo%3Fed%3D2560#${encodeURIComponent(name)}`,
    },
    {
      id: 'vmess-argo',
      protocol: 'VMess',
      name,
      link: `vmess://${Buffer.from(JSON.stringify(vmessPayload)).toString('base64')}`,
    },
    {
      id: 'trojan-argo',
      protocol: 'Trojan',
      name,
      link: `trojan://${uuid}@${cfip}:${cfport}?security=tls&sni=${argoDomain}&fp=firefox&type=ws&host=${argoDomain}&path=%2Ftrojan-argo%3Fed%3D2560#${encodeURIComponent(name)}`,
    },
  ];

  if (isValidPort(config.hy2Port)) {
    const pin = certFingerprint ? `&pinSHA256=${encodeURIComponent(certFingerprint)}` : '';
    accounts.push({
      id: 'hysteria2',
      protocol: 'Hysteria2',
      name,
      link: `hysteria2://${uuid}@${serverIP}:${config.hy2Port}/?sni=www.bing.com&insecure=0&alpn=h3&obfs=none${pin}#${encodeURIComponent(name)}`,
    });
  }

  if (isValidPort(config.realityPort)) {
    accounts.push({
      id: 'vless-reality',
      protocol: 'VLESS Reality',
      name,
      link: `vless://${uuid}@${serverIP}:${config.realityPort}?encryption=none&flow=xtls-rprx-vision&security=reality&sni=www.iij.ad.jp&fp=firefox&pbk=${realityPublicKey}&type=tcp&headerType=none#${encodeURIComponent(name)}`,
    });
  }

  if (isValidPort(config.s5Port)) {
    const auth = Buffer.from(`${uuid.substring(0, 8)}:${uuid.slice(-12)}`).toString('base64');
    accounts.push({
      id: 'socks5',
      protocol: 'SOCKS5',
      name,
      link: `socks://${auth}@${serverIP}:${config.s5Port}#${encodeURIComponent(name)}`,
    });
  }

  return accounts;
}

module.exports = { getIspLabel, getServerIP, buildAccounts };
