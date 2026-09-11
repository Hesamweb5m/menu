import { config } from "./config.js";

/**
 * An error that carries a Strapi-shaped error payload.
 * Strapi's client-visible errors look like:
 *   { data: null, error: { status, name, message, details } }
 */
export class ApiError extends Error {
  constructor(status, name, message, details = {}) {
    super(message);
    this.status = status;
    this.name = name;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, "ValidationError", message, details);
  }

  static unauthorized(message = "Missing or invalid credentials") {
    return new ApiError(401, "UnauthorizedError", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "ForbiddenError", message);
  }

  static notFound(message = "Not Found") {
    return new ApiError(404, "NotFoundError", message);
  }

  toBody() {
    return {
      data: null,
      error: {
        status: this.status,
        name: this.name,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/** `{ data, meta }` envelope for a collection route. */
export function collectionResponse(data, pagination) {
  return { data, meta: { pagination } };
}

/** `{ data, meta }` envelope for a single-entry route. */
export function singleResponse(data) {
  return { data, meta: {} };
}

/**
 * Parses Strapi's `sort` parameter into a safe ORDER BY clause.
 *
 * Accepts `sort=displayOrder:asc`, `sort=displayOrder`, and the indexed form
 * `sort[0]=displayOrder:asc&sort[1]=title:desc`. Fields are resolved through
 * `fieldMap`, so anything not explicitly allowed is rejected rather than
 * interpolated into SQL.
 */
export function parseSort(rawSort, fieldMap, fallback) {
  if (rawSort === undefined || rawSort === null || rawSort === "") {
    return fallback;
  }

  const entries = (Array.isArray(rawSort) ? rawSort : [rawSort])
    .flatMap((value) =>
      typeof value === "object" && value !== null ? Object.values(value) : value
    )
    .filter((value) => typeof value === "string" && value.trim() !== "");

  const clauses = [];

  for (const entry of entries) {
    const [field, rawDirection = "asc"] = entry.split(":");
    const column = fieldMap[field.trim()];

    if (!column) {
      throw ApiError.badRequest(`Invalid sort field: ${field}`, {
        allowed: Object.keys(fieldMap),
      });
    }

    const direction =
      rawDirection.trim().toLowerCase() === "desc" ? "DESC" : "ASC";

    // NULLs sort last in either direction so unordered rows never jump to the
    // top of the menu.
    clauses.push(`${column} IS NULL, ${column} ${direction}`);
  }

  return clauses.length ? clauses.join(", ") : fallback;
}

/**
 * Parses `pagination[page]` / `pagination[pageSize]`.
 * Strapi defaults pageSize to 25; this API defaults to `config.defaultPageSize`
 * (effectively "everything") because the frontend never paginates and a
 * silently truncated menu is worse than a large response.
 */
export function parsePagination(rawPagination = {}) {
  const pagination =
    typeof rawPagination === "object" && rawPagination !== null
      ? rawPagination
      : {};

  const page = Math.max(1, toInt(pagination.page, 1));
  const pageSize = Math.min(
    config.maxPageSize,
    Math.max(1, toInt(pagination.pageSize, config.defaultPageSize))
  );

  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginationMeta({ page, pageSize }, total) {
  return {
    page,
    pageSize,
    pageCount: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    total,
  };
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Strapi's `?populate=*` is honoured, but relations and media are returned
 * unconditionally: the frontend calls `GET /api/categories` with no populate in
 * some places and still expects images, and over-populating is harmless here.
 */
export function wantsPopulate() {
  return true;
}
