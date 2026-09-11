import { Router } from "express";
import { requireAuth } from "../auth.js";
import { db, generateDocumentId, nowIso, pruneOrphanFiles, transaction } from "../db.js";
import { normalizeMediaInput, setMediaLinks } from "../media.js";
import {
  CATEGORY_SORT_FIELDS,
  countRows,
  findCategoryRow,
  listCategoryRows,
  serializeCategory,
} from "../serializers.js";
import {
  ApiError,
  collectionResponse,
  paginationMeta,
  parsePagination,
  parseSort,
  singleResponse,
} from "../strapi.js";
import { readPayload, requireString, toDisplayOrder } from "./helpers.js";

const router = Router();

router.get("/", (req, res) => {
  const orderBy = parseSort(
    req.query.sort,
    CATEGORY_SORT_FIELDS,
    "c.display_order IS NULL, c.display_order ASC, c.id ASC"
  );
  const pagination = parsePagination(req.query.pagination);

  const rows = listCategoryRows(orderBy, pagination);

  res.json(
    collectionResponse(
      rows.map(serializeCategory),
      paginationMeta(pagination, countRows("categories"))
    )
  );
});

router.get("/:id", (req, res) => {
  const row = findCategoryRow(req.params.id);
  if (!row) throw ApiError.notFound(`Category not found: ${req.params.id}`);

  res.json(singleResponse(serializeCategory(row)));
});

router.post("/", requireAuth, (req, res) => {
  const payload = readPayload(req);
  const name = requireString(payload.name, "name");
  const displayOrder = toDisplayOrder(payload.displayOrder);
  const imageIds = normalizeMediaInput(payload.image);

  const created = transaction(() => {
    const timestamp = nowIso();

    const info = db
      .prepare(
        `INSERT INTO categories
           (document_id, name, display_order, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(generateDocumentId(), name, displayOrder, timestamp, timestamp, timestamp);

    const id = Number(info.lastInsertRowid);
    setMediaLinks("category", id, "image", imageIds ?? []);

    return findCategoryRow(id);
  })();

  res.status(201).json(singleResponse(serializeCategory(created)));
});

router.put("/:id", requireAuth, (req, res) => {
  const existing = findCategoryRow(req.params.id);
  if (!existing) throw ApiError.notFound(`Category not found: ${req.params.id}`);

  const payload = readPayload(req);

  // PUT behaves as a partial update, matching Strapi: the admin panel sends
  // only `{ displayOrder }` when reordering.
  const name =
    payload.name === undefined ? existing.name : requireString(payload.name, "name");
  const displayOrder =
    payload.displayOrder === undefined
      ? existing.display_order
      : toDisplayOrder(payload.displayOrder);
  const imageIds = normalizeMediaInput(payload.image);

  const updated = transaction(() => {
    db.prepare(
      `UPDATE categories
          SET name = ?, display_order = ?, updated_at = ?
        WHERE id = ?`
    ).run(name, displayOrder, nowIso(), existing.id);

    if (imageIds !== null) {
      setMediaLinks("category", existing.id, "image", imageIds);
      pruneOrphanFiles();
    }

    return findCategoryRow(existing.id);
  })();

  res.json(singleResponse(serializeCategory(updated)));
});

router.delete("/:id", requireAuth, (req, res) => {
  const existing = findCategoryRow(req.params.id);
  if (!existing) throw ApiError.notFound(`Category not found: ${req.params.id}`);

  transaction(() => {
    // Products keep existing with a null category (ON DELETE SET NULL); only
    // the category's own media links are removed.
    setMediaLinks("category", existing.id, "image", []);
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(existing.id);
    pruneOrphanFiles();
  })();

  res.status(204).end();
});

export default router;
