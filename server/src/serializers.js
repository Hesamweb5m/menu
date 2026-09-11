import { db } from "./db.js";
import { getMediaFiles } from "./media.js";
import { ApiError } from "./strapi.js";

export const CATEGORY_SORT_FIELDS = {
  id: "c.id",
  name: "c.name",
  displayOrder: "c.display_order",
  createdAt: "c.created_at",
  updatedAt: "c.updated_at",
  publishedAt: "c.published_at",
};

export const PRODUCT_SORT_FIELDS = {
  id: "p.id",
  title: "p.title",
  price: "p.price",
  available: "p.available",
  displayOrder: "p.display_order",
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
  publishedAt: "p.published_at",
};

/**
 * Categories expose `image` as an ARRAY of files.
 *
 * This matches how the frontend reads them:
 *   Category.jsx:37       item.image?.length > 0
 *   Category.jsx:39       item.image[0].url
 *   CategoryTable.jsx:33  item.image[0].url
 */
export function serializeCategory(row) {
  if (!row) return null;

  return {
    id: row.id,
    documentId: row.document_id,
    name: row.name,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    image: getMediaFiles("category", row.id, "image"),
  };
}

/**
 * Products expose `image` as a SINGLE file object (or null).
 *
 * This matches how the frontend reads them:
 *   Products.jsx:54-56  product.image && product.image.url
 *   Edit.jsx:38         item.image?.id
 *
 * Note the asymmetry with categories is deliberate: the frontend writes product
 * images as an array (`image: [id]`) but reads them as an object. The write path
 * accepts either shape, and the read path always returns the object form.
 */
export function serializeProduct(row) {
  if (!row) return null;

  const images = getMediaFiles("product", row.id, "image");

  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    description: row.description,
    price: row.price,
    available: Boolean(row.available),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    image: images[0] ?? null,
    category: row.category_id ? serializeCategory(findCategoryRow(row.category_id)) : null,
  };
}

const CATEGORY_COLUMNS = `
  c.id, c.document_id, c.name, c.display_order,
  c.created_at, c.updated_at, c.published_at
`;

const PRODUCT_COLUMNS = `
  p.id, p.document_id, p.title, p.description, p.price, p.available,
  p.display_order, p.category_id, p.created_at, p.updated_at, p.published_at
`;

export function findCategoryRow(idOrDocumentId) {
  return db
    .prepare(
      `SELECT ${CATEGORY_COLUMNS}
         FROM categories AS c
        WHERE c.document_id = ? OR c.id = ?`
    )
    .get(String(idOrDocumentId), toIdOrZero(idOrDocumentId));
}

export function findProductRow(idOrDocumentId) {
  return db
    .prepare(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products AS p
        WHERE p.document_id = ? OR p.id = ?`
    )
    .get(String(idOrDocumentId), toIdOrZero(idOrDocumentId));
}

export function listCategoryRows(orderBy, { pageSize, offset }) {
  return db
    .prepare(
      `SELECT ${CATEGORY_COLUMNS}
         FROM categories AS c
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);
}

export function listProductRows(orderBy, { pageSize, offset }) {
  return db
    .prepare(
      `SELECT ${PRODUCT_COLUMNS}
         FROM products AS p
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`
    )
    .all(pageSize, offset);
}

export function countRows(table) {
  return db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get().total;
}

/**
 * Resolves the `category` field of a product write payload.
 *
 * Both identifier forms have to work, because the two admin forms disagree:
 *   productcontrol.jsx:265  value={item.id || item.documentId}  -> numeric id
 *   Edit.jsx:123            value={cat.documentId}              -> documentId
 */
export function resolveCategoryId(value) {
  if (value === undefined) return null;
  if (value === null || value === "") return { id: null };

  const raw =
    typeof value === "object" ? (value.documentId ?? value.id ?? "") : value;

  if (raw === "" || raw === null || raw === undefined) return { id: null };

  const row = findCategoryRow(raw);
  if (!row) {
    throw ApiError.badRequest(`Category not found: ${raw}`);
  }

  return { id: row.id };
}

function toIdOrZero(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
