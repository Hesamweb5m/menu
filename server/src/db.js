import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import { config } from "./config.js";

export const db = new DatabaseSync(config.databaseFile);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   TEXT    NOT NULL UNIQUE,
    username      TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id      TEXT    NOT NULL UNIQUE,
    name             TEXT    NOT NULL,
    alternative_text TEXT,
    caption          TEXT,
    width            INTEGER,
    height           INTEGER,
    hash             TEXT    NOT NULL,
    ext              TEXT    NOT NULL,
    mime             TEXT    NOT NULL,
    size_bytes       INTEGER NOT NULL,
    url              TEXT    NOT NULL,
    content          BLOB    NOT NULL,
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    display_order INTEGER,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL,
    published_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id   TEXT    NOT NULL UNIQUE,
    title         TEXT    NOT NULL,
    description   TEXT,
    price         TEXT,
    available     INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER,
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at    TEXT    NOT NULL,
    updated_at    TEXT    NOT NULL,
    published_at  TEXT
  );

  -- Generic media attachment table. Keeping it generic lets a category expose
  -- "image" as an array while a product exposes it as a single object, which is
  -- exactly what the existing frontend reads.
  CREATE TABLE IF NOT EXISTS media_links (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id     INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    target_type TEXT    NOT NULL,
    target_id   INTEGER NOT NULL,
    field       TEXT    NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_media_links_target
    ON media_links (target_type, target_id, field);

  CREATE INDEX IF NOT EXISTS idx_products_category
    ON products (category_id);

  CREATE INDEX IF NOT EXISTS idx_products_display_order
    ON products (display_order);

  CREATE INDEX IF NOT EXISTS idx_categories_display_order
    ON categories (display_order);
`);

const DOCUMENT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Generates a Strapi v5 style documentId: 24 lowercase alphanumeric chars. */
export function generateDocumentId() {
  const bytes = crypto.randomBytes(24);
  let id = "";
  for (const byte of bytes) {
    id += DOCUMENT_ID_ALPHABET[byte % DOCUMENT_ID_ALPHABET.length];
  }
  return id;
}

export function nowIso() {
  return new Date().toISOString();
}

/**
 * Wraps a function in a transaction. node:sqlite has no transaction helper,
 * so BEGIN/COMMIT are issued manually.
 */
export function transaction(fn) {
  return (...args) => {
    db.exec("BEGIN");
    try {
      const result = fn(...args);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
}

/**
 * Deletes upload rows that are no longer attached to anything. Without this the
 * database grows every time an admin replaces a product photo.
 */
export function pruneOrphanFiles() {
  return db
    .prepare(
      `DELETE FROM files
        WHERE id NOT IN (SELECT file_id FROM media_links)`
    )
    .run().changes;
}
