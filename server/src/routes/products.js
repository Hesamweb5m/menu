import { Router } from "express";
import { requireAuth } from "../auth.js";
import { db, generateDocumentId, nowIso, pruneOrphanFiles, transaction } from "../db.js";
import { normalizeMediaInput, setMediaLinks } from "../media.js";
import {
  PRODUCT_SORT_FIELDS,
  countRows,
  findProductRow,
  listProductRows,
  resolveCategoryId,
  serializeProduct,
} from "../serializers.js";
import {
  ApiError,
  collectionResponse,
  paginationMeta,
  parsePagination,
  parseSort,
  singleResponse,
} from "../strapi.js";
import {
  optionalString,
  readPayload,
  requireString,
  toBoolean,
  toDisplayOrder,
} from "./helpers.js";

const router = Router();

router.get("/", (req, res) => {
  const orderBy = parseSort(
    req.query.sort,
    PRODUCT_SORT_FIELDS,
    "p.display_order IS NULL, p.display_order ASC, p.id ASC"
  );
  const pagination = parsePagination(req.query.pagination);

  const rows = listProductRows(orderBy, pagination);

  res.json(
    collectionResponse(
      rows.map(serializeProduct),
      paginationMeta(pagination, countRows("products"))
    )
  );
});

router.get("/:id", (req, res) => {
  const row = findProductRow(req.params.id);
  if (!row) throw ApiError.notFound(`Product not found: ${req.params.id}`);

  res.json(singleResponse(serializeProduct(row)));
});

router.post("/", requireAuth, (req, res) => {
  const payload = readPayload(req);

  const title = requireString(payload.title, "title");
  const description = optionalString(payload.description, "description");
  const price = optionalString(payload.price, "price");
  const available = toBoolean(payload.available, true);
  const displayOrder = toDisplayOrder(payload.displayOrder);
  const category = resolveCategoryId(payload.category);
  const imageIds = normalizeMediaInput(payload.image);

  const created = transaction(() => {
    const timestamp = nowIso();

    const info = db
      .prepare(
        `INSERT INTO products
           (document_id, title, description, price, available, display_order,
            category_id, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        generateDocumentId(),
        title,
        description,
        price,
        available ? 1 : 0,
        displayOrder,
        category?.id ?? null,
        timestamp,
        timestamp,
        timestamp
      );

    const id = Number(info.lastInsertRowid);
    setMediaLinks("product", id, "image", imageIds ?? []);

    return findProductRow(id);
  })();

  res.status(201).json(singleResponse(serializeProduct(created)));
});

router.put("/:id", requireAuth, (req, res) => {
  const existing = findProductRow(req.params.id);
  if (!existing) throw ApiError.notFound(`Product not found: ${req.params.id}`);

  const payload = readPayload(req);

  // Partial update, matching Strapi. The reordering code in
  // productcontrol.jsx:71 sends `{ data: { displayOrder } }` and nothing else,
  // so absent fields must keep their current values.
  const title =
    payload.title === undefined ? existing.title : requireString(payload.title, "title");
  const description =
    payload.description === undefined
      ? existing.description
      : optionalString(payload.description, "description");
  const price =
    payload.price === undefined ? existing.price : optionalString(payload.price, "price");
  const available =
    payload.available === undefined
      ? Boolean(existing.available)
      : toBoolean(payload.available, Boolean(existing.available));
  const displayOrder =
    payload.displayOrder === undefined
      ? existing.display_order
      : toDisplayOrder(payload.displayOrder);

  const category = resolveCategoryId(payload.category);
  const imageIds = normalizeMediaInput(payload.image);

  const updated = transaction(() => {
    db.prepare(
      `UPDATE products
          SET title = ?, description = ?, price = ?, available = ?,
              display_order = ?, category_id = ?, updated_at = ?
        WHERE id = ?`
    ).run(
      title,
      description,
      price,
      available ? 1 : 0,
      displayOrder,
      category === null ? existing.category_id : category.id,
      nowIso(),
      existing.id
    );

    if (imageIds !== null) {
      setMediaLinks("product", existing.id, "image", imageIds);
      pruneOrphanFiles();
    }

    return findProductRow(existing.id);
  })();

  res.json(singleResponse(serializeProduct(updated)));
});

router.delete("/:id", requireAuth, (req, res) => {
  const existing = findProductRow(req.params.id);
  if (!existing) throw ApiError.notFound(`Product not found: ${req.params.id}`);

  transaction(() => {
    setMediaLinks("product", existing.id, "image", []);
    db.prepare(`DELETE FROM products WHERE id = ?`).run(existing.id);
    pruneOrphanFiles();
  })();

  res.status(204).end();
});

export default router;
