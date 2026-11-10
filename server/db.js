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
  return createStore(db);
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
