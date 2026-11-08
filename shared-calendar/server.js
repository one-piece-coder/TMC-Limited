// Shared Calendar — a tiny, dependency-free calendar server for two (or a few) people.
// Run:  CALENDAR_USERS="alex:secret1,sam:secret2" node server.js
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DAYS = 30;

// ---------- users ----------
function loadUsers() {
  const raw = process.env.CALENDAR_USERS || '';
  const users = new Map();
  for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i < 1 || i === pair.length - 1) continue;
    users.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1));
  }
  return users;
}
const USERS = loadUsers();
if (USERS.size === 0) {
  console.error('No users configured. Start with e.g.:\n  CALENDAR_USERS="alex:password1,sam:password2" node server.js');
  process.exit(1);
}

function checkPassword(name, password) {
  const expected = USERS.get(String(name || '').trim().toLowerCase());
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(expected === undefined ? crypto.randomUUID() : expected).digest();
  return crypto.timingSafeEqual(a, b) && expected !== undefined;
}

// ---------- storage ----------
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch {}
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return s;
}
const SECRET = loadSecret();

let events = [];
try { events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); } catch { events = []; }

function saveEvents() {
  const tmp = EVENTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(events, null, 2));
  fs.renameSync(tmp, EVENTS_FILE);
}

// ---------- sessions (signed cookie) ----------
function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ u: user, exp: Date.now() + SESSION_DAYS * 864e5 })).toString('base64url');
  return payload + '.' + sign(payload);
}
function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() > exp || !USERS.has(u)) return null;
    return u;
  } catch { return null; }
}
function getCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
function currentUser(req) { return readToken(getCookie(req, 'cal_session')); }

// ---------- helpers ----------
function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e5) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function validateEvent(input) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const e = {
    title: str(input.title, 120),
    type: input.type === 'appointment' ? 'appointment' : 'event',
    date: str(input.date, 10),
    endDate: str(input.endDate, 10),
    allDay: Boolean(input.allDay),
    start: str(input.start, 5),
    end: str(input.end, 5),
    location: str(input.location, 200),
    notes: str(input.notes, 2000),
  };
  if (!e.title) return { error: 'Title is required.' };
  if (!DATE_RE.test(e.date)) return { error: 'A valid date is required.' };
  if (!e.endDate || !DATE_RE.test(e.endDate) || e.endDate < e.date) e.endDate = e.date;
  if (e.allDay) { e.start = ''; e.end = ''; }
  else {
    if (!TIME_RE.test(e.start)) return { error: 'Start time is required (or mark it all-day).' };
    if (e.end && !TIME_RE.test(e.end)) return { error: 'End time is invalid.' };
    if (e.end && e.endDate === e.date && e.end < e.start) return { error: 'End time is before start time.' };
  }
  return { event: e };
}

// ---------- live updates (Server-Sent Events) ----------
const clients = new Set();
function broadcast(msg) {
  const line = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) res.write(line);
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref();

// ---------- static files ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---------- routes ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    if (!p.startsWith('/api/')) return serveStatic(req, res, p);

    if (p === '/api/login' && req.method === 'POST') {
      const { name, password } = await readBody(req);
      if (!checkPassword(name, password)) return send(res, 401, { error: 'Wrong name or password.' });
      const user = String(name).trim().toLowerCase();
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      return send(res, 200, { user }, {
        'Set-Cookie': `cal_session=${makeToken(user)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`,
      });
    }
    if (p === '/api/logout' && req.method === 'POST') {
      return send(res, 200, { ok: true }, { 'Set-Cookie': 'cal_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }

    const user = currentUser(req);
    if (!user) return send(res, 401, { error: 'Not signed in.' });

    if (p === '/api/me' && req.method === 'GET') {
      return send(res, 200, { user, users: [...USERS.keys()] });
    }

    if (p === '/api/stream' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 3000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    if (p === '/api/events' && req.method === 'GET') {
      return send(res, 200, events);
    }

    if (p === '/api/events' && req.method === 'POST') {
      const { event, error } = validateEvent(await readBody(req));
      if (error) return send(res, 400, { error });
      const now = new Date().toISOString();
      const created = { id: crypto.randomUUID(), ...event, createdBy: user, updatedBy: user, createdAt: now, updatedAt: now };
      events.push(created);
      saveEvents();
      broadcast({ kind: 'created', id: created.id, by: user });
      return send(res, 201, created);
    }

    const m = p.match(/^\/api\/events\/([\w-]+)$/);
    if (m) {
      const idx = events.findIndex((e) => e.id === m[1]);
      if (idx === -1) return send(res, 404, { error: 'Event not found.' });

      if (req.method === 'PUT') {
        const { event, error } = validateEvent(await readBody(req));
        if (error) return send(res, 400, { error });
        events[idx] = { ...events[idx], ...event, updatedBy: user, updatedAt: new Date().toISOString() };
        saveEvents();
        broadcast({ kind: 'updated', id: m[1], by: user });
        return send(res, 200, events[idx]);
      }
      if (req.method === 'DELETE') {
        events.splice(idx, 1);
        saveEvents();
        broadcast({ kind: 'deleted', id: m[1], by: user });
        return send(res, 200, { ok: true });
      }
    }

    send(res, 404, { error: 'Not found.' });
  } catch (err) {
    send(res, 400, { error: err.message || 'Bad request.' });
  }
});

server.listen(PORT, () => {
  console.log(`Shared calendar running at http://localhost:${PORT}`);
  console.log(`Users: ${[...USERS.keys()].join(', ')}`);
});
