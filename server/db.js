import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  appliance_id TEXT NOT NULL DEFAULT '',
  repair_id TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  preferred_time TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS leads_created ON leads(created_at);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS scans_user_time ON scans(user_id, created_at);
CREATE TABLE IF NOT EXISTS projects (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_key TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, project_key)
);
`;

// Opens (or creates) the database. Pass ":memory:" for tests.
export function openDatabase(file = process.env.DATABASE_PATH || "data/fixit.db") {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  return createStore(db);
}

// Adds columns introduced after the first release to existing databases.
function migrate(db) {
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  if (!userColumns.includes("role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

function createStore(db) {
  const q = (sql) => db.prepare(sql);
  const stmts = {
    insertUser: q("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)"),
    userByEmail: q("SELECT * FROM users WHERE email = ?"),
    userById: q("SELECT * FROM users WHERE id = ?"),
    userByCustomer: q("SELECT * FROM users WHERE stripe_customer_id = ?"),
    setCustomer: q("UPDATE users SET stripe_customer_id = ? WHERE id = ?"),
    setPlan: q("UPDATE users SET plan = ?, subscription_status = ? WHERE id = ?"),
    insertSession: q("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
    sessionUser: q(
      "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?",
    ),
    deleteSession: q("DELETE FROM sessions WHERE token_hash = ?"),
    purgeSessions: q("DELETE FROM sessions WHERE expires_at <= ?"),
    setPassword: q("UPDATE users SET password_hash = ? WHERE id = ?"),
    deleteUserSessions: q("DELETE FROM sessions WHERE user_id = ?"),
    deleteUserResets: q("DELETE FROM password_resets WHERE user_id = ?"),
    insertReset: q("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
    resetByToken: q("SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > ?"),
    purgeResets: q("DELETE FROM password_resets WHERE expires_at <= ?"),
    setRole: q("UPDATE users SET role = ? WHERE id = ?"),
    countOwners: q("SELECT COUNT(*) AS n FROM users WHERE role = 'owner'"),
    ownerEmails: q("SELECT email FROM users WHERE role = 'owner'"),
    countUsers: q("SELECT COUNT(*) AS n FROM users"),
    countPro: q("SELECT COUNT(*) AS n FROM users WHERE plan = 'pro'"),
    countAllScans: q("SELECT COUNT(*) AS n FROM scans WHERE created_at >= ?"),
    allSettings: q("SELECT key, value FROM settings"),
    upsertSetting: q("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
    insertLead: q(`INSERT INTO leads (created_at, name, phone, email, zip, appliance_id, repair_id, message, preferred_time, source, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    leadById: q("SELECT * FROM leads WHERE id = ?"),
    listLeads: q("SELECT * FROM leads ORDER BY created_at DESC, id DESC LIMIT ?"),
    listLeadsByStatus: q("SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ?"),
    updateLead: q("UPDATE leads SET status = ?, notes = ? WHERE id = ?"),
    countLeadsSince: q("SELECT COUNT(*) AS n FROM leads WHERE created_at >= ?"),
    countLeadsByStatus: q("SELECT status, COUNT(*) AS n FROM leads GROUP BY status"),
    insertScan: q("INSERT INTO scans (user_id, created_at) VALUES (?, ?)"),
    deleteScan: q("DELETE FROM scans WHERE id = ?"),
    countScans: q("SELECT COUNT(*) AS n FROM scans WHERE user_id = ? AND created_at >= ?"),
    listProjects: q("SELECT project_key, data, updated_at FROM projects WHERE user_id = ?"),
    upsertProject: q(`INSERT INTO projects (user_id, project_key, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, project_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
      WHERE excluded.updated_at >= projects.updated_at`),
    deleteProject: q("DELETE FROM projects WHERE user_id = ? AND project_key = ?"),
  };

  return {
    raw: db,
    createUser(email, passwordHash) {
      const { lastInsertRowid } = stmts.insertUser.run(email, passwordHash, Date.now());
      return stmts.userById.get(lastInsertRowid);
    },
    userByEmail: (email) => stmts.userByEmail.get(email),
    userById: (id) => stmts.userById.get(id),
    userByCustomer: (customerId) => stmts.userByCustomer.get(customerId),
    setStripeCustomer: (userId, customerId) => stmts.setCustomer.run(customerId, userId),
    setPlan: (userId, plan, status) => stmts.setPlan.run(plan, status ?? null, userId),

    createSession: (tokenHash, userId, expiresAt) => stmts.insertSession.run(tokenHash, userId, expiresAt),
    sessionUser: (tokenHash) => stmts.sessionUser.get(tokenHash, Date.now()),
    deleteSession: (tokenHash) => stmts.deleteSession.run(tokenHash),
    purgeExpiredSessions: () => stmts.purgeSessions.run(Date.now()),

    // Only one reset link is valid at a time; asking again replaces the old one.
    createPasswordReset(userId, tokenHash, expiresAt) {
      stmts.purgeResets.run(Date.now());
      stmts.deleteUserResets.run(userId);
      stmts.insertReset.run(tokenHash, userId, expiresAt);
    },
    resetTokenUserId: (tokenHash) => stmts.resetByToken.get(tokenHash, Date.now())?.user_id ?? null,
    // Sets the new password, burns every reset link, and signs out all devices.
    resetPassword(userId, passwordHash) {
      db.exec("BEGIN");
      try {
        stmts.setPassword.run(passwordHash, userId);
        stmts.deleteUserResets.run(userId);
        stmts.deleteUserSessions.run(userId);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },

    // ---- owner / business ----
    setRole: (userId, role) => stmts.setRole.run(role, userId),
    ownerCount: () => stmts.countOwners.get().n,
    ownerEmails: () => stmts.ownerEmails.all().map((r) => r.email),
    stats(since) {
      return {
        users: stmts.countUsers.get().n,
        proSubscribers: stmts.countPro.get().n,
        scansThisMonth: stmts.countAllScans.get(since).n,
        leadsThisMonth: stmts.countLeadsSince.get(since).n,
        leadsByStatus: Object.fromEntries(stmts.countLeadsByStatus.all().map((r) => [r.status, r.n])),
      };
    },
    getSettings: () => Object.fromEntries(stmts.allSettings.all().map((r) => [r.key, JSON.parse(r.value)])),
    saveSettings(values) {
      db.exec("BEGIN");
      try {
        for (const [k, v] of Object.entries(values)) stmts.upsertSetting.run(k, JSON.stringify(v));
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    },
    createLead(l) {
      const { lastInsertRowid } = stmts.insertLead.run(
        Date.now(), l.name, l.phone, l.email, l.zip, l.applianceId, l.repairId, l.message, l.preferredTime, l.source, l.userId ?? null,
      );
      return stmts.leadById.get(lastInsertRowid);
    },
    leadById: (id) => stmts.leadById.get(id),
    listLeads: ({ status, limit = 500 } = {}) =>
      status ? stmts.listLeadsByStatus.all(status, limit) : stmts.listLeads.all(limit),
    updateLead: (id, { status, notes }) => stmts.updateLead.run(status, notes, id),

    // Records a scan and returns its id so it can be refunded if the scan fails.
    recordScan: (userId) => Number(stmts.insertScan.run(userId, Date.now()).lastInsertRowid),
    refundScan: (scanId) => stmts.deleteScan.run(scanId),
    countScansSince: (userId, since) => stmts.countScans.get(userId, since).n,

    listProjects: (userId) =>
      stmts.listProjects.all(userId).map((row) => ({ key: row.project_key, ...JSON.parse(row.data), updated: row.updated_at })),
    saveProject: (userId, key, data, updated) => stmts.upsertProject.run(userId, key, JSON.stringify(data), updated),
    deleteProject: (userId, key) => stmts.deleteProject.run(userId, key),
  };
}
