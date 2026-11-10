import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "fixit_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;
// Hash compared against when the email doesn't exist, so login timing doesn't reveal accounts.
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(KEY_LENGTH * 2)}`;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored = DUMMY_HASH) {
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 200
    ? null
    : "Password must be at least 8 characters.";
}

export function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function validateCredentials({ email, password } = {}) {
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    return { error: "Enter a valid email address." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };
  return { email: cleanEmail, password };
}

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const cookieSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production";

export function startSession(db, res, userId) {
  const token = newToken();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  db.createSession(hashToken(token), userId, Date.now() + maxAge * 1000);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${cookieSecure() ? "; Secure" : ""}`,
  );
}

export function endSession(db, req, res) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) db.deleteSession(hashToken(token));
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Attaches req.user (or null) from the session cookie.
export function loadUser(db) {
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.user = token ? db.sessionUser(hashToken(token)) || null : null;
    next();
  };
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please sign in first.", code: "auth_required" });
  next();
}

// Cross-site forms can't send application/json without a CORS preflight, so requiring it
// on state-changing API requests (together with SameSite cookies) blocks CSRF.
export function requireJson(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !req.is("application/json")) {
    return res.status(415).json({ error: "Requests must be sent as JSON." });
  }
  next();
}
