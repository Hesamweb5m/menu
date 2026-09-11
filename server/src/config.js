import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env loader so the server runs with plain `node src/index.js`
 * and no dotenv dependency. Real environment variables always win, which is
 * what hosting providers (Render, Railway, Fly) inject.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;

  for (const rawLine of fs.readFileSync(file, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

const serverRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(serverRoot, ".env"));

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(serverRoot, "data");

fs.mkdirSync(dataDir, { recursive: true });

/**
 * A JWT secret must be stable across restarts or every admin session is
 * invalidated on deploy. In production we refuse to start without one rather
 * than silently generating a throwaway; in development we persist a generated
 * one next to the database so local logins survive a restart.
 */
function resolveJwtSecret(isProduction) {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (isProduction) {
    throw new Error(
      "JWT_SECRET is required in production. Generate one with:\n" +
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  const secretFile = path.join(dataDir, ".dev-jwt-secret");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString("hex"), {
      mode: 0o600,
    });
  }
  return fs.readFileSync(secretFile, "utf8").trim();
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

export const config = {
  nodeEnv,
  isProduction,

  // 1337 is Strapi's default port, which is what the frontend targets.
  port: Number(process.env.PORT || 1337),
  host: process.env.HOST || "0.0.0.0",

  dataDir,
  databaseFile: process.env.DATABASE_FILE
    ? path.resolve(process.env.DATABASE_FILE)
    : path.join(dataDir, "menu.db"),

  jwtSecret: resolveJwtSecret(isProduction),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "30d",

  adminEmail: process.env.ADMIN_EMAIL || "admin@atlass.cafe",
  adminPassword: process.env.ADMIN_PASSWORD || null,

  /**
   * Comma-separated list of allowed browser origins, e.g.
   * "http://localhost:5173,https://hesamweb5m.github.io".
   * Empty means "reflect any origin", which is only safe because every
   * mutating route requires a Bearer token (cookies are never used).
   */
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),

  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),

  // Default page size. Strapi defaults to 25, which would silently truncate a
  // menu; the frontend never paginates, so we return everything by default.
  defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE || 1000),
  maxPageSize: Number(process.env.MAX_PAGE_SIZE || 1000),
};
