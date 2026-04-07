const crypto = require('node:crypto');

const COOKIE_NAME = 'isc_admin_session';

function base64urlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createToken(adminName = '관리자') {
  const secret = getSecret();
  const payload = {
    adminName,
    issuedAt: Date.now(),
  };

  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;

  const [encoded, signature] = token.split('.');
  const secret = getSecret();
  const expected = sign(encoded, secret);

  if (signature !== expected) {
    return null;
  }

  try {
    return JSON.parse(base64urlDecode(encoded));
  } catch {
    return null;
  }
}

function parseCookies(headers = {}) {
  const raw = headers.cookie || headers.Cookie || '';
  return raw
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [key, ...rest] = item.split('=');
      acc[key] = rest.join('=');
      return acc;
    }, {});
}

function getSessionFromEvent(event) {
  const cookies = parseCookies(event.headers || {});
  return verifyToken(cookies[COOKIE_NAME]);
}

function buildSessionCookie(token) {
  const secure = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getSecret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || 'temporary-secret';
}

module.exports = {
  buildSessionCookie,
  clearSessionCookie,
  createToken,
  getSessionFromEvent,
};
