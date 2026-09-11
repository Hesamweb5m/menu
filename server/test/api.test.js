/**
 * Integration tests against a live HTTP server backed by a throwaway database.
 *
 * The assertions deliberately mirror the exact field shapes the existing
 * frontend reads, so a regression here means a broken page rather than just a
 * failing test.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "menu-backend-test-"));

// Must be set before the modules below are imported: config.js and db.js read
// the environment and open the database at import time.
process.env.DATA_DIR = tempDir;
process.env.DATABASE_FILE = path.join(tempDir, "test.db");
process.env.JWT_SECRET = "test-secret-not-used-in-production";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "test-password-123";
process.env.NODE_ENV = "test";

const { createApp } = await import("../src/app.js");
const { ensureAdminUser } = await import("../src/auth.js");
const { db } = await import("../src/db.js");

// A valid 1x1 PNG, used to exercise upload and header-based size detection.
const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64"
);

let baseUrl;
let server;
let token;

async function request(method, endpoint, { body, auth = false, raw } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${token}`;

  let payload = raw;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: payload,
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, body: json, text, headers: response.headers };
}

before(async () => {
  ensureAdminUser();

  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await request("POST", "/api/auth/local", {
    body: { identifier: "admin@test.local", password: "test-password-123" },
  });

  assert.equal(login.status, 200, `login failed: ${login.text}`);
  token = login.body.jwt;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("health", () => {
  it("reports ok", async () => {
    const { status, body } = await request("GET", "/api/health");
    assert.equal(status, 200);
    assert.equal(body.status, "ok");
  });
});

describe("auth", () => {
  it("returns a jwt and user for valid credentials", async () => {
    const { status, body } = await request("POST", "/api/auth/local", {
      body: { identifier: "admin@test.local", password: "test-password-123" },
    });

    assert.equal(status, 200);
    assert.ok(typeof body.jwt === "string" && body.jwt.length > 20);
    assert.equal(body.user.email, "admin@test.local");
    assert.ok(!("password_hash" in body.user), "must not leak the password hash");
  });

  it("rejects a wrong password with a Strapi-shaped error", async () => {
    const { status, body } = await request("POST", "/api/auth/local", {
      body: { identifier: "admin@test.local", password: "wrong" },
    });

    assert.equal(status, 400);
    assert.equal(body.data, null);
    assert.equal(body.error.status, 400);
    assert.equal(body.error.name, "ValidationError");
  });

  it("rejects an unknown identifier", async () => {
    const { status } = await request("POST", "/api/auth/local", {
      body: { identifier: "nobody@test.local", password: "test-password-123" },
    });

    assert.equal(status, 400);
  });

  it("returns the current user for GET /api/users/me", async () => {
    const { status, body } = await request("GET", "/api/users/me", { auth: true });
    assert.equal(status, 200);
    assert.equal(body.email, "admin@test.local");
  });

  it("blocks writes without a token", async () => {
    const { status, body } = await request("POST", "/api/categories", {
      body: { data: { name: "unauthorized" } },
    });

    assert.equal(status, 401);
    assert.equal(body.error.name, "UnauthorizedError");
  });

  it("blocks writes with a malformed token", async () => {
    const response = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-a-real-token",
      },
      body: JSON.stringify({ data: { name: "nope" } }),
    });

    assert.equal(response.status, 401);
  });

  it("allows reads without a token", async () => {
    const { status } = await request("GET", "/api/products");
    assert.equal(status, 200);
  });
});

describe("upload", () => {
  it("returns a bare array of file objects, as the frontend expects", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "latte.png");

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    assert.equal(response.status, 201);

    const files = await response.json();

    // productcontrol.jsx:123 -> uploadRes.data[0].id
    assert.ok(Array.isArray(files), "response must be an array, not { data }");
    assert.equal(files.length, 1);

    const [file] = files;
    assert.equal(typeof file.id, "number");
    assert.equal(file.name, "latte.png");
    assert.equal(file.ext, ".png");
    assert.equal(file.mime, "image/png");
    assert.equal(file.width, 1, "PNG dimensions should be read from the header");
    assert.equal(file.height, 1);
    assert.ok(file.url.startsWith("/uploads/"), "url must be root-relative");
  });

  it("serves the uploaded bytes back at its url", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "served.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [file] = await upload.json();

    const response = await fetch(`${baseUrl}${file.url}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");

    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.equals(ONE_BY_ONE_PNG), "served bytes must match the upload");
  });

  it("rejects a non-image upload", async () => {
    const form = new FormData();
    form.append(
      "files",
      new Blob([Buffer.from("#!/bin/sh\necho hi")], { type: "application/x-sh" }),
      "evil.sh"
    );

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    assert.equal(response.status, 400);
  });

  it("requires authentication", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "x.png");

    const response = await fetch(`${baseUrl}/api/upload`, { method: "POST", body: form });
    assert.equal(response.status, 401);
  });

  it("404s for an unknown file", async () => {
    const { status } = await request("GET", "/uploads/does-not-exist.png");
    assert.equal(status, 404);
  });
});

describe("categories", () => {
  it("creates a category and exposes image as an ARRAY", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "hot.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [icon] = await upload.json();

    // categorycontrol.jsx:87 sends a bare id, not an array.
    const { status, body } = await request("POST", "/api/categories", {
      auth: true,
      body: { data: { name: "نوشیدنی گرم", displayOrder: 100, image: icon.id } },
    });

    assert.equal(status, 201, body && JSON.stringify(body));

    const category = body.data;
    assert.equal(typeof category.id, "number");
    assert.equal(typeof category.documentId, "string");
    assert.equal(category.name, "نوشیدنی گرم");
    assert.equal(category.displayOrder, 100);

    // Category.jsx:37,39 -> item.image?.length > 0 && item.image[0].url
    assert.ok(Array.isArray(category.image), "category.image must be an array");
    assert.equal(category.image.length, 1);
    assert.equal(category.image[0].id, icon.id);
    assert.ok(category.image[0].url.startsWith("/uploads/"));
  });

  it("lists categories in a { data, meta } envelope", async () => {
    const { status, body } = await request("GET", "/api/categories?populate=*");

    assert.equal(status, 200);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.pagination.total >= 1);
  });

  it("populates image even without ?populate, which Edit.jsx relies on", async () => {
    const { body } = await request("GET", "/api/categories");
    const withImage = body.data.find((item) => item.image.length > 0);

    assert.ok(withImage, "at least one category should carry its image");
  });

  it("sorts by displayOrder:asc", async () => {
    await request("POST", "/api/categories", {
      auth: true,
      body: { data: { name: "زودتر", displayOrder: 10 } },
    });

    const { body } = await request("GET", "/api/categories?sort=displayOrder:asc");
    const orders = body.data.map((item) => item.displayOrder);
    const sorted = [...orders].sort((a, b) => a - b);

    assert.deepEqual(orders, sorted);
    assert.equal(body.data[0].name, "زودتر");
  });

  it("sorts by displayOrder:desc", async () => {
    const { body } = await request("GET", "/api/categories?sort=displayOrder:desc");
    const orders = body.data.map((item) => item.displayOrder);

    assert.deepEqual(orders, [...orders].sort((a, b) => b - a));
  });

  it("rejects an unknown sort field instead of interpolating it", async () => {
    const { status, body } = await request(
      "GET",
      "/api/categories?sort=name);DROP TABLE categories;--:asc"
    );

    assert.equal(status, 400);
    assert.equal(body.error.name, "ValidationError");

    // Confirm the table is intact.
    const { status: stillWorks } = await request("GET", "/api/categories");
    assert.equal(stillWorks, 200);
  });

  it("updates only the fields supplied", async () => {
    const created = await request("POST", "/api/categories", {
      auth: true,
      body: { data: { name: "قبل", displayOrder: 500 } },
    });
    const { documentId } = created.body.data;

    const updated = await request("PUT", `/api/categories/${documentId}`, {
      auth: true,
      body: { data: { displayOrder: 600 } },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.name, "قبل", "name must survive a partial update");
    assert.equal(updated.body.data.displayOrder, 600);
  });

  it("deletes a category and leaves its products orphaned, not deleted", async () => {
    const category = await request("POST", "/api/categories", {
      auth: true,
      body: { data: { name: "موقت", displayOrder: 900 } },
    });
    const categoryDocumentId = category.body.data.documentId;

    const product = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "محصول یتیم", price: "1000", category: categoryDocumentId } },
    });
    const productDocumentId = product.body.data.documentId;

    const deleted = await request("DELETE", `/api/categories/${categoryDocumentId}`, {
      auth: true,
    });
    assert.equal(deleted.status, 204);

    const gone = await request("GET", `/api/categories/${categoryDocumentId}`);
    assert.equal(gone.status, 404);

    const survivor = await request("GET", `/api/products/${productDocumentId}`);
    assert.equal(survivor.status, 200);
    assert.equal(survivor.body.data.category, null);
  });

  it("requires a name", async () => {
    const { status, body } = await request("POST", "/api/categories", {
      auth: true,
      body: { data: { displayOrder: 1 } },
    });

    assert.equal(status, 400);
    assert.equal(body.error.details.field, "name");
  });
});

describe("products", () => {
  let categoryId;
  let categoryDocumentId;

  before(async () => {
    const { body } = await request("POST", "/api/categories", {
      auth: true,
      body: { data: { name: "قهوه", displayOrder: 200 } },
    });

    categoryId = body.data.id;
    categoryDocumentId = body.data.documentId;
  });

  it("creates a product, exposing image as a SINGLE object", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "espresso.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [photo] = await upload.json();

    // productcontrol.jsx:136 sends image as an array.
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: {
        data: {
          title: "اسپرسو",
          description: "تک شات",
          price: "65000",
          available: true,
          category: categoryDocumentId,
          image: [photo.id],
          displayOrder: 100,
        },
      },
    });

    assert.equal(status, 201, body && JSON.stringify(body));

    const product = body.data;

    // Products.jsx:56 -> product.image.url ; Edit.jsx:38 -> item.image?.id
    assert.ok(
      product.image && !Array.isArray(product.image),
      "product.image must be a single object"
    );
    assert.equal(product.image.id, photo.id);
    assert.ok(product.image.url.startsWith("/uploads/"));

    assert.equal(product.title, "اسپرسو");
    assert.equal(product.price, "65000");
    assert.equal(product.available, true, "available must be a real boolean");

    // Products.jsx:49 -> product.category?.id === category.id
    // Manage.jsx:116  -> product.category?.documentId
    assert.equal(product.category.id, categoryId);
    assert.equal(product.category.documentId, categoryDocumentId);
  });

  it("accepts a numeric category id, which productcontrol.jsx sends", async () => {
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "آمریکانو", price: "75000", category: categoryId } },
    });

    assert.equal(status, 201);
    assert.equal(body.data.category.id, categoryId);
  });

  it("accepts a documentId category, which Edit.jsx sends", async () => {
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "لاته", price: "98000", category: categoryDocumentId } },
    });

    assert.equal(status, 201);
    assert.equal(body.data.category.documentId, categoryDocumentId);
  });

  it("rejects an unknown category", async () => {
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "بی‌دسته", category: "nonexistent-document-id" } },
    });

    assert.equal(status, 400);
    assert.match(body.error.message, /Category not found/);
  });

  it("stores available: false", async () => {
    const { body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "ناموجود", price: "1", available: false } },
    });

    assert.equal(body.data.available, false);

    const reread = await request("GET", `/api/products/${body.data.documentId}`);
    assert.equal(reread.body.data.available, false, "must survive a round trip");
  });

  it("supports the displayOrder-only update used for reordering", async () => {
    const created = await request("POST", "/api/products", {
      auth: true,
      body: {
        data: {
          title: "برای مرتب‌سازی",
          description: "توضیح اصلی",
          price: "5000",
          available: false,
          category: categoryDocumentId,
          displayOrder: 100,
        },
      },
    });
    const { documentId } = created.body.data;

    // productcontrol.jsx:71 sends only displayOrder.
    const { status, body } = await request("PUT", `/api/products/${documentId}`, {
      auth: true,
      body: { data: { displayOrder: 250 } },
    });

    assert.equal(status, 200);
    assert.equal(body.data.displayOrder, 250);
    assert.equal(body.data.title, "برای مرتب‌سازی");
    assert.equal(body.data.description, "توضیح اصلی");
    assert.equal(body.data.price, "5000");
    assert.equal(body.data.available, false);
    assert.equal(body.data.category.documentId, categoryDocumentId);
  });

  it("keeps the existing photo when a partial update omits image", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "keep.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [photo] = await upload.json();

    const created = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "با عکس", price: "1", image: [photo.id] } },
    });

    const updated = await request("PUT", `/api/products/${created.body.data.documentId}`, {
      auth: true,
      body: { data: { displayOrder: 400 } },
    });

    assert.equal(updated.body.data.image.id, photo.id);
  });

  it("clears the photo when image is an empty array", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "clear.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [photo] = await upload.json();

    const created = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "حذف عکس", price: "1", image: [photo.id] } },
    });

    // Edit.jsx:57 -> image: imageId ? [imageId] : []
    const updated = await request("PUT", `/api/products/${created.body.data.documentId}`, {
      auth: true,
      body: { data: { image: [] } },
    });

    assert.equal(updated.body.data.image, null);
  });

  it("rejects a reference to a file that was never uploaded", async () => {
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "عکس جعلی", image: [999999] } },
    });

    assert.equal(status, 400);
    assert.match(body.error.message, /does not exist/);
  });

  it("sorts by displayOrder:asc with nulls last", async () => {
    await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "بدون ترتیب", price: "1" } },
    });

    const { body } = await request(
      "GET",
      "/api/products?populate=*&sort=displayOrder:asc"
    );

    const orders = body.data.map((item) => item.displayOrder);
    const firstNullIndex = orders.indexOf(null);

    if (firstNullIndex !== -1) {
      assert.ok(
        orders.slice(firstNullIndex).every((value) => value === null),
        "null displayOrder rows must all sort to the end"
      );
    }

    const numeric = orders.filter((value) => value !== null);
    assert.deepEqual(numeric, [...numeric].sort((a, b) => a - b));
  });

  it("returns every product by default rather than Strapi's 25-row page", async () => {
    const { body } = await request("GET", "/api/products");

    assert.equal(
      body.data.length,
      body.meta.pagination.total,
      "the default page must not truncate the menu"
    );
  });

  it("honours explicit pagination", async () => {
    const { body } = await request(
      "GET",
      "/api/products?pagination[page]=1&pagination[pageSize]=2"
    );

    assert.equal(body.data.length, 2);
    assert.equal(body.meta.pagination.pageSize, 2);
    assert.equal(body.meta.pagination.page, 1);
  });

  it("deletes a product", async () => {
    const created = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "حذف شود", price: "1" } },
    });
    const { documentId } = created.body.data;

    const deleted = await request("DELETE", `/api/products/${documentId}`, { auth: true });
    assert.equal(deleted.status, 204);

    const gone = await request("GET", `/api/products/${documentId}`);
    assert.equal(gone.status, 404);
  });

  it("requires a title", async () => {
    const { status, body } = await request("POST", "/api/products", {
      auth: true,
      body: { data: { price: "1000" } },
    });

    assert.equal(status, 400);
    assert.equal(body.error.details.field, "title");
  });

  it("404s for an unknown product", async () => {
    const { status, body } = await request("GET", "/api/products/nope");
    assert.equal(status, 404);
    assert.equal(body.error.name, "NotFoundError");
  });
});

describe("orphan cleanup", () => {
  it("removes an upload once nothing references it", async () => {
    const form = new FormData();
    form.append("files", new Blob([ONE_BY_ONE_PNG], { type: "image/png" }), "orphan.png");

    const upload = await fetch(`${baseUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const [photo] = await upload.json();

    const created = await request("POST", "/api/products", {
      auth: true,
      body: { data: { title: "با عکس موقت", price: "1", image: [photo.id] } },
    });

    await request("PUT", `/api/products/${created.body.data.documentId}`, {
      auth: true,
      body: { data: { image: [] } },
    });

    const response = await fetch(`${baseUrl}${photo.url}`);
    assert.equal(response.status, 404, "the detached file should have been pruned");
  });
});

describe("error handling", () => {
  it("returns a Strapi-shaped 404 for an unknown route", async () => {
    const { status, body } = await request("GET", "/api/nope");

    assert.equal(status, 404);
    assert.equal(body.data, null);
    assert.equal(body.error.status, 404);
  });

  it("rejects malformed JSON", async () => {
    const response = await fetch(`${baseUrl}/api/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{not json",
    });

    assert.equal(response.status, 400);
  });

  it("accepts a bare body without the data wrapper", async () => {
    const { status, body } = await request("POST", "/api/categories", {
      auth: true,
      body: { name: "بدون رَپر", displayOrder: 1200 },
    });

    assert.equal(status, 201);
    assert.equal(body.data.name, "بدون رَپر");
  });

  it("sends permissive CORS headers for the browser", async () => {
    const response = await fetch(`${baseUrl}/api/products`, {
      headers: { Origin: "http://localhost:5173" },
    });

    assert.ok(response.headers.get("access-control-allow-origin"));
  });
});
