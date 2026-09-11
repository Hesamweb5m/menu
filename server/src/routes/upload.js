import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { requireAuth } from "../auth.js";
import { insertFile, serializeFile } from "../media.js";
import { ApiError } from "../strapi.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

// Files are held in memory and written into SQLite as a BLOB, so the database
// file is the single piece of state to persist. That keeps uploads alive on
// hosts with an ephemeral filesystem, where anything written to disk is lost on
// the next deploy.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        ApiError.badRequest(`Unsupported file type: ${file.mimetype}`, {
          allowed: [...ALLOWED_MIME_TYPES],
        })
      );
      return;
    }
    callback(null, true);
  },
});

const router = Router();

/**
 * POST /api/upload  (multipart/form-data, field name "files")
 *
 * Mirrors Strapi's upload plugin: responds with a bare ARRAY of file objects,
 * not a `{ data, meta }` envelope. The frontend relies on that shape —
 * `uploadRes.data[0].id` in productcontrol.jsx:123.
 */
router.post("/", requireAuth, upload.array("files", 10), (req, res) => {
  const files = req.files ?? [];

  if (files.length === 0) {
    throw ApiError.badRequest(
      'No files received. Send multipart/form-data with a "files" field.'
    );
  }

  const created = files.map((file) =>
    serializeFile(
      insertFile({
        originalName: file.originalname,
        mime: file.mimetype,
        buffer: file.buffer,
      })
    )
  );

  res.status(201).json(created);
});

export default router;
