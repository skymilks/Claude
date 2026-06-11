// Built-in email+password auth: scrypt hashes (node:crypto), opaque session
// tokens in SQLite, httpOnly SameSite=Lax cookie. No external auth service —
// the app stays self-contained; swapping to a managed provider later replaces
// this module and nothing else.
import { Router } from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, uid, now } from './db.js';
import { seatStarterTeam } from './hire.js';

const COOKIE = 'pa_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOCKOUT_AFTER = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = (stored ?? '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function setSessionCookie(res, token, maxAgeSeconds) {
  // Set SECURE_COOKIES=1 in production (HTTPS) deployments.
  const secure = process.env.SECURE_COOKIES === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${secure}`);
}

function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)`).run(
    token, userId, now(), new Date(Date.now() + SESSION_TTL_MS).toISOString()
  );
  setSessionCookie(res, token, SESSION_TTL_MS / 1000);
}

export function requireAuth(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  const session = token ? db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token) : undefined;
  if (!session || session.expiresAt < now()) return res.status(401).json({ error: 'Not signed in' });
  req.userId = session.userId;
  next();
}

// Founder mode: accounts whose email is listed in ADMIN_EMAILS (comma-
// separated) can build prospect demo offices. Everyone else never sees it.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
);

export function isAdminUserId(userId) {
  const user = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
  return !!user?.email && ADMIN_EMAILS.has(user.email.toLowerCase());
}

export function requireAdmin(req, res, next) {
  if (!isAdminUserId(req.userId)) return res.status(403).json({ error: 'Not available on this account' });
  next();
}

// Light brute-force protection: in-memory failure counts per email.
const failures = new Map();
const lockedOut = (key) => {
  const f = failures.get(key);
  return !!f && f.count >= LOCKOUT_AFTER && Date.now() < f.until;
};
const recordFailure = (key) => {
  const f = failures.get(key) ?? { count: 0, until: 0 };
  failures.set(key, { count: f.count + 1, until: Date.now() + LOCKOUT_MS });
};

// Builds before auth existed stored everything under ownerId 'local'; the
// first real account adopts that workspace so an upgrade loses nothing.
function adoptLegacyData(userId) {
  if (!db.prepare(`SELECT 1 FROM users WHERE id = 'local'`).get()) return;
  for (const table of ['agents', 'tasks', 'unlocks']) {
    db.prepare(`UPDATE ${table} SET ownerId = ? WHERE ownerId = 'local'`).run(userId);
  }
  db.prepare(`DELETE FROM users WHERE id = 'local'`).run();
}

export const authRoutes = Router();

authRoutes.post('/api/auth/signup', (req, res) => {
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const password = req.body?.password ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  const userId = uid();
  db.prepare(
    `INSERT INTO users (id, email, plan, usageThisPeriod, createdAt, passwordHash, periodStart) VALUES (?, ?, 'free', 0, ?, ?, ?)`
  ).run(userId, email, now(), hashPassword(password), now());
  adoptLegacyData(userId);
  // Unless legacy data brought a team along, seat the starter trio so the
  // first thing a new account sees is a working office, not empty desks.
  if (!db.prepare(`SELECT 1 FROM agents WHERE ownerId = ?`).get(userId)) seatStarterTeam(userId);
  startSession(res, userId);
  res.json({ ok: true });
});

authRoutes.post('/api/auth/login', (req, res) => {
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const password = req.body?.password ?? '';
  if (lockedOut(email)) return res.status(429).json({ error: 'Too many attempts — try again in 15 minutes' });
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordFailure(email);
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  failures.delete(email);
  startSession(res, user.id);
  res.json({ ok: true });
});

authRoutes.post('/api/auth/logout', (req, res) => {
  const token = parseCookies(req)[COOKIE];
  if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
});

export function sweepExpiredSessions() {
  db.prepare(`DELETE FROM sessions WHERE expiresAt < ?`).run(now());
}
