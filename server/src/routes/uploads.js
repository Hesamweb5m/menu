import { Router } from "express";
import { findFileContentByUrlName } from "../media.js";
import { ApiError } from "../strapi.js";

const router = Router();

/**
 * Serves an uploaded image out of the database.
 *
 * The frontend builds these URLs as `${API_ORIGIN}${file.url}`, e.g.
 * `http://localhost:1337/uploads/latte_a1b2c3d4e5.png`.
 */
router.get("/:filename", (req, res) => {
  const row = findFileContentByUrlName(req.params.filename);
  if (!row) throw ApiError.notFound(`File not found: ${req.params.filename}`);

  // The filename embeds a random hash, so a given URL never changes content.
  const etag = `"${req.params.filename}"`;

  if (req.get("if-none-match") === etag) {
    res.status(304).end();
    return;
  }

  res.set({
    "Content-Type": row.mime,
    "Content-Length": String(row.size_bytes),
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "Last-Modified": new Date(row.updated_at).toUTCString(),
  });

  res.end(Buffer.from(row.content));
});

export default router;
