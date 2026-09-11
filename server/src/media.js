import { db, generateDocumentId, nowIso } from "./db.js";
import { ApiError } from "./strapi.js";

/**
 * Reads intrinsic dimensions straight out of the file header for the formats a
 * menu realistically uses. Returns nulls for anything unrecognised; Strapi
 * reports width/height on image uploads and the field is part of its contract.
 */
export function readImageSize(buffer) {
  const none = { width: null, height: null };
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return none;

  // PNG: 8-byte signature, then the IHDR chunk carries width/height big-endian.
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // GIF: logical screen descriptor at offset 6, little-endian.
  if (buffer.subarray(0, 3).toString("latin1") === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  // WebP: RIFF container with a VP8 / VP8L / VP8X chunk.
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return readWebpSize(buffer) ?? none;
  }

  // JPEG: walk the segment chain looking for a Start Of Frame marker.
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpegSize(buffer) ?? none;
  }

  return none;
}

function readWebpSize(buffer) {
  const chunk = buffer.subarray(12, 16).toString("latin1");

  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: (buffer.readUIntLE(24, 3) & 0xffffff) + 1,
      height: (buffer.readUIntLE(27, 3) & 0xffffff) + 1,
    };
  }

  return null;
}

function readJpegSize(buffer) {
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11 all carry the frame dimensions.
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb);

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    // Markers without a payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    offset += 2 + buffer.readUInt16BE(offset + 2);
  }

  return null;
}

/** Serialises a `files` row into Strapi's upload-plugin file object. */
export function serializeFile(row) {
  if (!row) return null;

  return {
    id: row.id,
    documentId: row.document_id,
    name: row.name,
    alternativeText: row.alternative_text,
    caption: row.caption,
    width: row.width,
    height: row.height,
    formats: null,
    hash: row.hash,
    ext: row.ext,
    mime: row.mime,
    // Strapi reports size in kilobytes, rounded to two decimals.
    size: Math.round((row.size_bytes / 1024) * 100) / 100,
    url: row.url,
    previewUrl: null,
    provider: "local",
    provider_metadata: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FILE_COLUMNS = `
  id, document_id, name, alternative_text, caption, width, height,
  hash, ext, mime, size_bytes, url, created_at, updated_at
`;

export function insertFile({ originalName, mime, buffer }) {
  const { name, ext } = splitFileName(originalName);
  const hash = `${slugify(name)}_${generateDocumentId().slice(0, 10)}`;
  const { width, height } = readImageSize(buffer);
  const timestamp = nowIso();

  const info = db
    .prepare(
      `INSERT INTO files (
         document_id, name, alternative_text, caption, width, height,
         hash, ext, mime, size_bytes, url, content, created_at, updated_at
       ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      generateDocumentId(),
      `${name}${ext}`,
      width,
      height,
      hash,
      ext,
      mime,
      buffer.length,
      `/uploads/${hash}${ext}`,
      buffer,
      timestamp,
      timestamp
    );

  return findFileById(Number(info.lastInsertRowid));
}

export function findFileById(id) {
  return db
    .prepare(`SELECT ${FILE_COLUMNS} FROM files WHERE id = ?`)
    .get(id);
}

export function findFileContentByUrlName(fileName) {
  return db
    .prepare(
      `SELECT content, mime, size_bytes, updated_at
         FROM files
        WHERE url = ?`
    )
    .get(`/uploads/${fileName}`);
}

/**
 * Accepts every media shape the frontend sends and returns a list of file ids.
 *
 *   image: 47          -> [47]     (categorycontrol.jsx)
 *   image: [47]        -> [47]     (productcontrol.jsx, Manage.jsx, Edit.jsx)
 *   image: []          -> []       (Edit.jsx, clearing the photo)
 *   image: { id: 47 }  -> [47]
 *   image: undefined   -> null     (field absent: leave untouched)
 */
export function normalizeMediaInput(value) {
  if (value === undefined) return null;
  if (value === null || value === "") return [];

  const list = Array.isArray(value) ? value : [value];
  const ids = [];

  for (const entry of list) {
    const id =
      typeof entry === "object" && entry !== null
        ? Number(entry.id ?? entry.documentId)
        : Number(entry);

    if (!Number.isInteger(id) || id <= 0) {
      throw ApiError.badRequest(`Invalid media reference: ${JSON.stringify(entry)}`);
    }

    if (!findFileById(id)) {
      throw ApiError.badRequest(`Uploaded file ${id} does not exist`);
    }

    ids.push(id);
  }

  return ids;
}

export function setMediaLinks(targetType, targetId, field, fileIds) {
  db.prepare(
    `DELETE FROM media_links
      WHERE target_type = ? AND target_id = ? AND field = ?`
  ).run(targetType, targetId, field);

  const insert = db.prepare(
    `INSERT INTO media_links (file_id, target_type, target_id, field, sort_order)
     VALUES (?, ?, ?, ?, ?)`
  );

  fileIds.forEach((fileId, index) => {
    insert.run(fileId, targetType, targetId, field, index);
  });
}

export function getMediaFiles(targetType, targetId, field) {
  return db
    .prepare(
      `SELECT ${FILE_COLUMNS.split(",").map((c) => `f.${c.trim()}`).join(", ")}
         FROM media_links AS ml
         JOIN files AS f ON f.id = ml.file_id
        WHERE ml.target_type = ? AND ml.target_id = ? AND ml.field = ?
        ORDER BY ml.sort_order ASC, ml.id ASC`
    )
    .all(targetType, targetId, field)
    .map(serializeFile);
}

function splitFileName(originalName) {
  const safe = (originalName || "upload").replace(/[/\\]/g, "_");
  const dot = safe.lastIndexOf(".");

  if (dot <= 0) return { name: safe, ext: "" };
  return { name: safe.slice(0, dot), ext: safe.slice(dot).toLowerCase() };
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  // Non-latin filenames (the menu is Persian) slugify to an empty string.
  return slug || "file";
}
