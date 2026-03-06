/**
 * Bootstrap DB — idempotent schema check for shared Arena database.
 *
 * Arena creates the core tables (competitions, seasons, etc.).
 * Dashboard needs extra columns (archived, coverImageUrl) and its own tables
 * (users, admin_logs, chat_moderation). This script ensures they exist.
 *
 * Uses information_schema queries for maximum compatibility across
 * MySQL 5.7+, MySQL 8.0, TiDB, and MariaDB.
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const TAG = "[bootstrap]";

export async function bootstrapDb(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn(`${TAG} Database not available, skipping schema bootstrap`);
    return;
  }

  console.log(`${TAG} Checking schema compatibility...`);

  try {
    // ── Add missing columns to Arena tables ──────────────────────────────

    await safeAddColumn(db, "competitions", "archived", "int NOT NULL DEFAULT 0");
    await safeAddColumn(db, "competitions", "coverImageUrl", "varchar(512)");
    await safeAddColumn(db, "seasons", "archived", "int NOT NULL DEFAULT 0");

    // ── Add missing indexes ──────────────────────────────────────────────

    await safeCreateIndex(db, "competitions", "idx_comp_archived", "archived");

    // ── Create dashboard-only tables ─────────────────────────────────────

    await safeExec(db, `
      CREATE TABLE IF NOT EXISTS users (
        id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
        openId varchar(64) NOT NULL,
        name text,
        email varchar(320),
        loginMethod varchar(64),
        role enum('user','admin') NOT NULL DEFAULT 'user',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY users_openId_unique (openId)
      )
    `);

    await safeExec(db, `
      CREATE TABLE IF NOT EXISTS admin_logs (
        id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
        adminUserId int NOT NULL,
        adminName varchar(128) NOT NULL,
        action varchar(64) NOT NULL,
        targetType varchar(32) NOT NULL,
        targetId varchar(64) NOT NULL,
        description text NOT NULL,
        metadata text,
        ipAddress varchar(45),
        createdAt bigint NOT NULL
      )
    `);

    await safeCreateIndex(db, "admin_logs", "idx_admin_logs_admin", "adminUserId");
    await safeCreateIndex(db, "admin_logs", "idx_admin_logs_action", "action");
    await safeCreateIndex(db, "admin_logs", "idx_admin_logs_time", "createdAt");

    await safeExec(db, `
      CREATE TABLE IF NOT EXISTS chat_moderation (
        id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
        chatMessageId varchar(64) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'visible',
        moderatedBy int,
        moderatedByName varchar(128),
        moderatedAt bigint,
        reason text,
        UNIQUE KEY chat_moderation_chatMessageId_unique (chatMessageId)
      )
    `);

    await safeCreateIndex(db, "chat_moderation", "idx_chat_mod_status", "status");

    console.log(`${TAG} Schema check complete`);
  } catch (err) {
    console.error(`${TAG} Schema bootstrap failed:`, err);
  }
}

/** Check if a column exists via information_schema, add it if missing */
async function safeAddColumn(
  db: any,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  try {
    const [rows] = await db.execute(sql.raw(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' LIMIT 1`
    ));
    if (Array.isArray(rows) && rows.length > 0) {
      return; // column already exists
    }
    await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`));
    console.log(`${TAG} Added column ${table}.${column}`);
  } catch (err: any) {
    const msg: string = err?.message || err?.sqlMessage || "";
    if (msg.includes("Duplicate column")) return; // race condition, column was added concurrently
    console.warn(`${TAG} Failed to add column ${table}.${column}:`, msg.slice(0, 200));
  }
}

async function safeExec(db: any, rawSql: string): Promise<void> {
  try {
    await db.execute(sql.raw(rawSql));
  } catch (err: any) {
    const msg: string = err?.message || err?.sqlMessage || "";
    if (msg.includes("already exists")) return;
    console.warn(`${TAG} Statement failed:`, msg.slice(0, 200));
  }
}

async function safeCreateIndex(
  db: any,
  table: string,
  indexName: string,
  columns: string,
): Promise<void> {
  try {
    const [rows] = await db.execute(sql.raw(
      `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${table}' AND index_name = '${indexName}' LIMIT 1`
    ));
    if (Array.isArray(rows) && rows.length > 0) return;
    await db.execute(sql.raw(`CREATE INDEX ${indexName} ON ${table} (${columns})`));
  } catch (err: any) {
    const msg: string = err?.message || err?.sqlMessage || "";
    if (msg.includes("Duplicate key name") || msg.includes("already exists")) return;
    console.warn(`${TAG} Index ${indexName} skipped:`, msg.slice(0, 200));
  }
}
