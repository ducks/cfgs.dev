import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Lazy-initialize database to avoid errors during build
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "cfgs.db");
  const dbDir = path.dirname(dbPath);

  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

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
    claimed INTEGER DEFAULT 0,
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

  // Migration: add claimed column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!columns.some(c => c.name === "claimed")) {
    db.exec("ALTER TABLE users ADD COLUMN claimed INTEGER DEFAULT 0");
  }

  return db;
}

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
  claimed: boolean;
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
  const stmt = getDb().prepare(`
    INSERT INTO users (id, username, name, email, avatar_url, provider, provider_id, dotfiles_url, claimed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_id) DO UPDATE SET
      username = excluded.username,
      name = excluded.name,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      claimed = CASE WHEN excluded.claimed = 1 THEN 1 ELSE users.claimed END,
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
    user.dotfiles_url,
    user.claimed ? 1 : 0
  ) as User;
}

// Create or get unclaimed user from username
export function getOrCreateUnclaimedUser(
  username: string,
  provider: string,
  providerId: string,
  avatarUrl?: string,
  name?: string
): User {
  // Check if user already exists
  const existing = getUserByUsername(username);
  if (existing) {
    return existing;
  }

  // Create unclaimed user
  const id = crypto.randomUUID();
  const stmt = getDb().prepare(`
    INSERT INTO users (id, username, name, avatar_url, provider, provider_id, claimed)
    VALUES (?, ?, ?, ?, ?, ?, 0)
    RETURNING *
  `);
  return stmt.get(id, username, name || null, avatarUrl || null, provider, providerId) as User;
}

export function getUserById(id: string): User | undefined {
  const stmt = getDb().prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as User | undefined;
}

export function getUserByUsername(username: string): User | undefined {
  const stmt = getDb().prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username) as User | undefined;
}

export function updateUserDotfiles(userId: string, dotfilesUrl: string): void {
  const stmt = getDb().prepare(`
    UPDATE users SET dotfiles_url = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(dotfilesUrl, userId);
}

export function getAllUsers(limit = 50): User[] {
  const stmt = getDb().prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT ?");
  return stmt.all(limit) as User[];
}

// Scan operations
export function createScan(scan: Omit<Scan, "created_at" | "completed_at" | "files_scanned" | "bytes_read" | "duration_ms" | "error" | "status">): Scan {
  const stmt = getDb().prepare(`
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
  const stmt = getDb().prepare(`UPDATE scans SET ${fields.join(", ")} WHERE id = ?`);
  stmt.run(...values);
}

export function getLatestScanForUser(userId: string): Scan | undefined {
  const stmt = getDb().prepare(`
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
  const db = getDb();
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
  const stmt = getDb().prepare(`
    SELECT * FROM detections WHERE user_id = ?
    ORDER BY category, name
  `);
  return stmt.all(userId) as DetectionRecord[];
}

// Stats
export function getToolStats(): Array<{ tool_id: string; name: string; category: string; count: number }> {
  const stmt = getDb().prepare(`
    SELECT tool_id, name, category, COUNT(DISTINCT user_id) as count
    FROM detections
    GROUP BY tool_id
    ORDER BY count DESC
  `);
  return stmt.all() as Array<{ tool_id: string; name: string; category: string; count: number }>;
}

export function getUsersByTool(toolId: string): Array<User & { details: string | null }> {
  const stmt = getDb().prepare(`
    SELECT u.*, d.details
    FROM users u
    JOIN detections d ON d.user_id = u.id
    WHERE d.tool_id = ?
    ORDER BY u.username
  `);
  return stmt.all(toolId) as Array<User & { details: string | null }>;
}

export function getToolInfo(toolId: string): { tool_id: string; name: string; category: string } | undefined {
  const stmt = getDb().prepare(`
    SELECT tool_id, name, category FROM detections WHERE tool_id = ? LIMIT 1
  `);
  return stmt.get(toolId) as { tool_id: string; name: string; category: string } | undefined;
}

export function getCategories(): Array<{ category: string; count: number }> {
  const stmt = getDb().prepare(`
    SELECT category, COUNT(DISTINCT tool_id) as count
    FROM detections
    GROUP BY category
    ORDER BY category
  `);
  return stmt.all() as Array<{ category: string; count: number }>;
}

export function getToolsByCategory(category: string): Array<{ tool_id: string; name: string; count: number }> {
  const stmt = getDb().prepare(`
    SELECT tool_id, name, COUNT(DISTINCT user_id) as count
    FROM detections
    WHERE category = ?
    GROUP BY tool_id
    ORDER BY count DESC
  `);
  return stmt.all(category) as Array<{ tool_id: string; name: string; count: number }>;
}

// Search operations
export function getAllTools(): Array<{ tool_id: string; name: string; category: string }> {
  const stmt = getDb().prepare(`
    SELECT DISTINCT tool_id, name, category
    FROM detections
    ORDER BY name
  `);
  return stmt.all() as Array<{ tool_id: string; name: string; category: string }>;
}

export function searchUsersByUsername(query: string, limit = 20): User[] {
  const stmt = getDb().prepare(`
    SELECT * FROM users
    WHERE username LIKE ?
    ORDER BY
      CASE WHEN username = ? THEN 0
           WHEN username LIKE ? THEN 1
           ELSE 2 END,
      username
    LIMIT ?
  `);
  const pattern = `%${query}%`;
  const startsWithPattern = `${query}%`;
  return stmt.all(pattern, query, startsWithPattern, limit) as User[];
}

export function getUsersByMultipleTools(toolIds: string[], limit = 50): Array<User & { matchedTools: number }> {
  if (toolIds.length === 0) return [];

  const placeholders = toolIds.map(() => '?').join(', ');
  const stmt = getDb().prepare(`
    SELECT u.*, COUNT(DISTINCT d.tool_id) as matchedTools
    FROM users u
    JOIN detections d ON d.user_id = u.id
    WHERE d.tool_id IN (${placeholders})
    GROUP BY u.id
    HAVING COUNT(DISTINCT d.tool_id) = ?
    ORDER BY u.username
    LIMIT ?
  `);
  return stmt.all(...toolIds, toolIds.length, limit) as Array<User & { matchedTools: number }>;
}

export function searchTools(query: string, limit = 20): Array<{ tool_id: string; name: string; category: string; count: number }> {
  const stmt = getDb().prepare(`
    SELECT tool_id, name, category, COUNT(DISTINCT user_id) as count
    FROM detections
    WHERE name LIKE ? OR tool_id LIKE ?
    GROUP BY tool_id
    ORDER BY
      CASE WHEN LOWER(name) = LOWER(?) THEN 0
           WHEN LOWER(name) LIKE LOWER(?) THEN 1
           ELSE 2 END,
      count DESC
    LIMIT ?
  `);
  const pattern = `%${query}%`;
  const startsWithPattern = `${query}%`;
  return stmt.all(pattern, pattern, query, startsWithPattern, limit) as Array<{ tool_id: string; name: string; category: string; count: number }>;
}

// Find users with similar tool setups
export function getSimilarUsers(userId: string, limit = 5): Array<User & { sharedTools: number; totalUserTools: number; totalOtherTools: number; similarity: number }> {
  const stmt = getDb().prepare(`
    WITH user_tools AS (
      SELECT tool_id FROM detections WHERE user_id = ?
    ),
    user_tool_count AS (
      SELECT COUNT(*) as count FROM user_tools
    )
    SELECT
      u.*,
      COUNT(DISTINCT d.tool_id) as sharedTools,
      (SELECT count FROM user_tool_count) as totalUserTools,
      (SELECT COUNT(DISTINCT tool_id) FROM detections WHERE user_id = u.id) as totalOtherTools,
      CAST(COUNT(DISTINCT d.tool_id) AS REAL) /
        ((SELECT count FROM user_tool_count) +
         (SELECT COUNT(DISTINCT tool_id) FROM detections WHERE user_id = u.id) -
         COUNT(DISTINCT d.tool_id)) as similarity
    FROM users u
    JOIN detections d ON d.user_id = u.id
    WHERE d.tool_id IN (SELECT tool_id FROM user_tools)
      AND u.id != ?
    GROUP BY u.id
    HAVING sharedTools > 0
    ORDER BY similarity DESC, sharedTools DESC
    LIMIT ?
  `);
  return stmt.all(userId, userId, limit) as Array<User & { sharedTools: number; totalUserTools: number; totalOtherTools: number; similarity: number }>;
}

// Get shared tools between two users
export function getSharedTools(userId1: string, userId2: string): Array<{ tool_id: string; name: string; category: string }> {
  const stmt = getDb().prepare(`
    SELECT DISTINCT d1.tool_id, d1.name, d1.category
    FROM detections d1
    JOIN detections d2 ON d1.tool_id = d2.tool_id
    WHERE d1.user_id = ? AND d2.user_id = ?
    ORDER BY d1.category, d1.name
  `);
  return stmt.all(userId1, userId2) as Array<{ tool_id: string; name: string; category: string }>;
}

export { getDb };
export default getDb;
