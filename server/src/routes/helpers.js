import { ApiError } from "../strapi.js";

/**
 * Strapi wraps write payloads in `{ data: {...} }`, which is what the frontend
 * sends. A bare object is also accepted so the API is usable from curl.
 */
export function readPayload(req) {
  const body = req.body;

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }

  const payload = "data" in body ? body.data : body;

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw ApiError.badRequest("`data` must be a JSON object");
  }

  return payload;
}

export function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw ApiError.badRequest(`${field} is required`, { field });
  }
  return value.trim();
}

export function optionalString(value, field) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") {
    throw ApiError.badRequest(`${field} must be a string`, { field });
  }
  return value;
}

export function toDisplayOrder(value) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw ApiError.badRequest("displayOrder must be a number", {
      field: "displayOrder",
    });
  }
  return Math.trunc(parsed);
}

/** Accepts true/false, "true"/"false", and 1/0 — form controls send all three. */
export function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;

  throw ApiError.badRequest("available must be a boolean", { field: "available" });
}
