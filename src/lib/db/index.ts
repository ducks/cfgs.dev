import Database from "better-sqlite3";
import path from "path";

// Initialize database
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "cfgs.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    dotfiles_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, provider_id)
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    repo_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    files_scanned INTEGER DEFAULT 0,
    bytes_read INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT NOT NULL REFERENCES scans(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    tool_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    confidence TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_detections_user ON detections(user_id);
  CREATE INDEX IF NOT EXISTS idx_detections_category ON detections(category);
  CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id);
`);

// Types
export interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  provider: string;
  provider_id: string;
  dotfiles_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  repo_url: string;
  status: "pending" | "scanning" | "completed" | "failed";
  files_scanned: number;
  bytes_read: number;
  duration_ms: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DetectionRecord {
  id: number;
  scan_id: string;
  user_id: string;
  tool_id: string;
  category: string;
  name: string;
  confidence: string;
  details: string | null; // JSON string
  created_at: string;
}

// User operations
export function createUser(user: Omit<User, "created_at" | "updated_at">): User {
  const stmt = db.prepare(`
    INSERT INTO users (id, username, name, email, avatar_url, provider, provider_id, dotfiles_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_id) DO UPDATE SET
      username = excluded.username,
      name = excluded.name,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      updated_at = datetime('now')
    RETURNING *
  `);
  return stmt.get(
    user.id,
    user.username,
    user.name,
    user.email,
    user.avatar_url,
    user.provider,
    user.provider_id,
    user.dotfiles_url
  ) as User;
}

export function getUserById(id: string): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username) as User | undefined;
}

export function updateUserDotfiles(userId: string, dotfilesUrl: string): void {
  const stmt = db.prepare(`
    UPDATE users SET dotfiles_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(dotfilesUrl, userId);
}

export function getAllUsers(limit = 50): User[] {
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ?");
  return stmt.all(limit) as User[];
}

// Scan operations
export function createScan(scan: Omit<Scan, "created_at" | "completed_at" | "files_scanned" | "bytes_read" | "duration_ms" | "error" | "status">): Scan {
  const stmt = db.prepare(`
    INSERT INTO scans (id, user_id, repo_url)
    VALUES (?, ?, ?)
    RETURNING *
  `);
  return stmt.get(scan.id, scan.user_id, scan.repo_url) as Scan;
}

export function updateScan(
  scanId: string,
  updates: Partial<Pick<Scan, "status" | "files_scanned" | "bytes_read" | "duration_ms" | "error">>
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
    if (updates.status === "completed" || updates.status === "failed") {
      fields.push("completed_at = datetime('now')");
    }
  }
  if (updates.files_scanned !== undefined) {
    fields.push("files_scanned = ?");
    values.push(updates.files_scanned);
  }
  if (updates.bytes_read !== undefined) {
    fields.push("bytes_read = ?");
    values.push(updates.bytes_read);
  }
  if (updates.duration_ms !== undefined) {
    fields.push("duration_ms = ?");
    values.push(updates.duration_ms);
  }
  if (updates.error !== undefined) {
    fields.push("error = ?");
    values.push(updates.error);
  }

  if (fields.length === 0) return;

  values.push(scanId);
  const stmt = db.prepare(`UPDATE scans SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
}

export function getLatestScanForUser(userId: string): Scan | undefined {
  const stmt = db.prepare(`
    SELECT * FROM scans WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 1
  `);
  return stmt.get(userId) as Scan | undefined;
}

// Detection operations
export function saveDetections(
  scanId: string,
  userId: string,
  detections: Array<{ tool_id: string; category: string; name: string; confidence: string; details?: Record<string, string> }>
): void {
  const stmt = db.prepare(`
    INSERT INTO detections (scan_id, user_id, tool_id, category, name, confidence, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Clear old detections for this user
  db.prepare("DELETE FROM detections WHERE user_id = ?").run(userId);

  const insertMany = db.transaction((dets: typeof detections) => {
    for (const d of dets) {
      stmt.run(
        scanId,
        userId,
        d.tool_id,
        d.category,
        d.name,
        d.confidence,
        d.details ? JSON.stringify(d.details) : null
      );
    }
  });

  insertMany(detections);
}

export function getDetectionsForUser(userId: string): DetectionRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM detections WHERE user_id = ?
    ORDER BY category, name
  `);
  return stmt.all(userId) as DetectionRecord[];
}

// Stats
export function getToolStats(): Array<{ tool_id: string; name: string; category: string; count: number }> {
  const stmt = db.prepare(`
    SELECT tool_id, name, category, COUNT(DISTINCT user_id) as count
    FROM detections
    GROUP BY tool_id
    ORDER BY count DESC
  `);
  return stmt.all() as Array<{ tool_id: string; name: string; category: string; count: number }>;
}

export default db;
