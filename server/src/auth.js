import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { db, generateDocumentId, nowIso } from "./db.js";
import { ApiError } from "./strapi.js";

const BCRYPT_ROUNDS = 10;

/**
 * Ensures exactly one admin account exists.
 *
 * ADMIN_PASSWORD is treated as the source of truth: setting it (or changing it)
 * and restarting rotates the password, which is how you recover access on a
 * host where you only control environment variables. With no ADMIN_PASSWORD and
 * no existing admin, a random password is generated and logged once.
 */
export function ensureAdminUser() {
  const existing = db
    .prepare(
      `SELECT id, email, password_hash FROM admin_users ORDER BY id ASC LIMIT 1`
    )
    .get();

  if (!existing) {
    const password =
      config.adminPassword || crypto.randomBytes(9).toString("base64url");

    db.prepare(
      `INSERT INTO admin_users
         (document_id, username, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      generateDocumentId(),
      "admin",
      config.adminEmail,
      bcrypt.hashSync(password, BCRYPT_ROUNDS),
      nowIso(),
      nowIso()
    );

    if (config.adminPassword) {
      console.log(`[auth] Created admin account ${config.adminEmail}`);
    } else {
      console.log(
        "\n" +
          "  ┌──────────────────────────────────────────────────────────┐\n" +
          "  │  Admin account created. Save these credentials now.      │\n" +
          "  └──────────────────────────────────────────────────────────┘\n" +
          `     email:    ${config.adminEmail}\n` +
          `     password: ${password}\n\n` +
          "  Set ADMIN_PASSWORD in the environment to choose your own.\n"
      );
    }
    return;
  }

  // Rotate the password / email when ADMIN_PASSWORD is supplied and changed.
  if (config.adminPassword) {
    const unchanged =
      bcrypt.compareSync(config.adminPassword, existing.password_hash) &&
      existing.email === config.adminEmail;

    if (!unchanged) {
      db.prepare(
        `UPDATE admin_users
            SET email = ?, password_hash = ?, updated_at = ?
          WHERE id = ?`
      ).run(
        config.adminEmail,
        bcrypt.hashSync(config.adminPassword, BCRYPT_ROUNDS),
        nowIso(),
        existing.id
      );
      console.log(`[auth] Admin credentials updated for ${config.adminEmail}`);
    }
  }
}

export function verifyCredentials(identifier, password) {
  if (typeof identifier !== "string" || typeof password !== "string") {
    throw ApiError.badRequest("identifier and password are required");
  }

  const user = db
    .prepare(
      `SELECT id, document_id, username, email, password_hash, created_at, updated_at
         FROM admin_users
        WHERE lower(email) = lower(?) OR lower(username) = lower(?)`
    )
    .get(identifier.trim(), identifier.trim());

  // Compare against a dummy hash when the user is missing so a wrong email and
  // a wrong password take the same amount of time.
  const hash =
    user?.password_hash ||
    "$2b$10$0000000000000000000000000000000000000000000000000000";

  if (!bcrypt.compareSync(password, hash) || !user) {
    throw ApiError.badRequest("Invalid identifier or password");
  }

  return user;
}

export function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function serializeUser(user) {
  return {
    id: user.id,
    documentId: user.document_id,
    username: user.username,
    email: user.email,
    confirmed: true,
    blocked: false,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/** Express middleware: rejects the request unless a valid Bearer token is present. */
export function requireAuth(req, _res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (!token || scheme.toLowerCase() !== "bearer") {
    return next(ApiError.unauthorized("Missing or invalid Authorization header"));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }

  const user = db
    .prepare(
      `SELECT id, document_id, username, email, created_at, updated_at
         FROM admin_users
        WHERE id = ?`
    )
    .get(payload.id);

  if (!user) return next(ApiError.unauthorized("Account no longer exists"));

  req.user = user;
  return next();
}
