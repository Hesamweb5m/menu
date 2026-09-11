import { createApp } from "./app.js";
import { config } from "./config.js";
import { ensureAdminUser } from "./auth.js";
import { db } from "./db.js";

ensureAdminUser();

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`[menu-backend] listening on http://${config.host}:${config.port}`);
  console.log(`[menu-backend] database: ${config.databaseFile}`);
  console.log(
    `[menu-backend] cors: ${
      config.corsOrigins.length ? config.corsOrigins.join(", ") : "any origin"
    }`
  );
});

function shutdown(signal) {
  console.log(`\n[menu-backend] ${signal} received, shutting down`);

  server.close(() => {
    // Checkpoint the WAL into the main database file so a single-file backup or
    // a volume snapshot is always complete.
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.close();
    } catch (error) {
      console.error("[menu-backend] error closing database", error);
    }
    process.exit(0);
  });

  // Don't hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
