const { jwtVerify } = require('jose');
const crypto = require('crypto');
const env = require('../config/env');

let publicKey;
function getPublicKey() {
  if (!publicKey) {
    const pem = Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf8');
    publicKey = crypto.createPublicKey(pem);
  }
  return publicKey;
}

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token', code: 'AUTH_REQUIRED' });
  }

  try {
    const { payload } = await jwtVerify(header.slice(7), getPublicKey(), {
      issuer: 'tot-api',
      audience: 'tot-client',
      algorithms: ['RS256'],
    });
    req.userId = parseInt(payload.sub, 10);
    next();
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  try {
    const { payload } = await jwtVerify(header.slice(7), getPublicKey(), {
      issuer: 'tot-api',
      audience: 'tot-client',
      algorithms: ['RS256'],
    });
    req.userId = parseInt(payload.sub, 10);
  } catch {
    // proceed unauthenticated
  }
  next();
}

module.exports = { auth, optionalAuth };
