# Menu backend

REST API for the Atlass Cafe menu frontend in the repository root.

The frontend was written against [Strapi 5](https://strapi.io), so this server
speaks the same dialect — `{ data, meta }` envelopes, `documentId` identifiers,
`?populate=*&sort=displayOrder:asc` queries and a `POST /upload` endpoint that
returns a bare array of file objects. The frontend needs no changes to talk to
it.

It is a plain Express app instead of Strapi itself: the frontend uses about ten
endpoints, and this version installs in seconds, has **no native dependencies**
(SQLite comes from Node's built-in `node:sqlite`), and deploys to any Node host
without a separate database service.

## Quick start

```bash
cd server
npm install
npm run seed     # optional: 7 categories and 20 products to start from
npm run dev
```

The server listens on <http://localhost:1337> — the origin the frontend falls
back to when `VITE_API_URL` is unset.

On first run an admin account is created. Set `ADMIN_PASSWORD` beforehand to
choose the password, or leave it unset and the generated one is printed to the
console **once**:

```
  ┌──────────────────────────────────────────────────────────┐
  │  Admin account created. Save these credentials now.      │
  └──────────────────────────────────────────────────────────┘
     email:    admin@atlass.cafe
     password: xK3nP8fQzR2m
```

Copy `.env.example` to `.env` to configure anything. To rotate a lost password,
set `ADMIN_PASSWORD` and restart — it is treated as the source of truth.

```bash
npm start        # production
npm test         # 42 integration tests against a throwaway database
npm run seed -- --reset   # replace the menu with the starter data
```

## Where the data lives

Everything — categories, products, admin account **and uploaded images** — is in
a single SQLite file, `data/menu.db`.

Images are stored as blobs in that file rather than as files on disk. That is
deliberate: most cheap hosts give a web service an ephemeral filesystem, so
anything written next to the code disappears on the next deploy. One file also
means backing up the menu is `cp data/menu.db elsewhere`.

The practical consequence for deployment: **mount a persistent volume at
`DATA_DIR`**, or the menu resets on redeploy.

## Endpoints

Base path `/api`. Reads are public; every write needs
`Authorization: Bearer <jwt>`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/local` | – | `{ identifier, password }` → `{ jwt, user }` |
| `GET` | `/api/users/me` | yes | Validate a stored token |
| `GET` | `/api/categories` | – | Supports `sort`, `pagination`, `populate` |
| `GET` | `/api/categories/:documentId` | – | Numeric `id` also accepted |
| `POST` | `/api/categories` | yes | `{ data: { name, displayOrder, image } }` |
| `PUT` | `/api/categories/:documentId` | yes | Partial update |
| `DELETE` | `/api/categories/:documentId` | yes | `204`; its products survive with `category: null` |
| `GET` | `/api/products` | – | Same query support |
| `GET` | `/api/products/:documentId` | – | |
| `POST` | `/api/products` | yes | `{ data: { title, description, price, available, category, image, displayOrder } }` |
| `PUT` | `/api/products/:documentId` | yes | Partial update |
| `DELETE` | `/api/products/:documentId` | yes | `204` |
| `POST` | `/api/upload` | yes | `multipart/form-data`, field `files` → **array** of file objects |
| `GET` | `/uploads/:filename` | – | Serves an uploaded image |
| `GET` | `/api/health` | – | For host health checks |

### Response shape

```jsonc
// GET /api/products?populate=*&sort=displayOrder:asc
{
  "data": [
    {
      "id": 1,
      "documentId": "faav2ul705hlt3ztto5gc0fm",
      "title": "اسپرسو",
      "description": "تک شات",
      "price": "65000",
      "available": true,
      "displayOrder": 100,
      "createdAt": "2026-09-11T12:58:24.657Z",
      "updatedAt": "2026-09-11T12:58:24.657Z",
      "publishedAt": "2026-09-11T12:58:24.657Z",
      "image": { "id": 8, "url": "/uploads/coffee_e7826myejw.svg", "...": "..." },
      "category": { "id": 2, "documentId": "n2zgu4ls...", "name": "قهوه", "...": "..." }
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 1000, "pageCount": 1, "total": 20 } }
}
```

Errors use Strapi's envelope, so `error.response.status` switches in the
frontend keep working:

```json
{
  "data": null,
  "error": { "status": 400, "name": "ValidationError", "message": "title is required", "details": { "field": "title" } }
}
```

### Two details worth knowing

**`image` is an array on a category and an object on a product.** That is not an
oversight — it is what the existing frontend reads:

- `Category.jsx` and `CategoryTable.jsx` do `item.image[0].url` and check
  `item.image?.length > 0`
- `Products.jsx` does `product.image.url`, and `Edit.jsx` does `item.image?.id`

The write path is lenient in both directions and accepts `47`, `"47"`, `[47]`,
`{ id: 47 }` or `[]` to clear, because the four admin forms each send a
different one of those.

**`category` accepts a numeric `id` or a `documentId`.** `productcontrol.jsx`
sends `item.id || item.documentId`, which resolves to the numeric id, while
`Edit.jsx` sends `cat.documentId`. Both work.

### Deliberate differences from Strapi

- **No default pagination limit.** Strapi returns 25 rows per page; the
  frontend never paginates, so a 26th product would silently vanish from the
  menu. The default `pageSize` is 1000, and `?pagination[page]`/`[pageSize]`
  work if you want them.
- **Relations and media are always populated**, whether or not `?populate=*` is
  present. `Edit.jsx` calls `GET /api/categories` with no populate and still
  needs the data.
- **No `filters[...]` support.** Nothing in the frontend uses it. Searching is
  done client-side.
- **Single admin account, no role system.** Reads are public, writes need the
  token. That is the entire permission model.
- **Unreferenced uploads are deleted automatically** when the last thing
  pointing at them goes away, so replacing a photo does not leak rows.

## Deploying

GitHub Pages cannot run this — it only serves static files. The frontend goes to
Pages (see [`../.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml));
this service needs a Node host.

Whichever you pick, set these environment variables:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 32+ random bytes; the server refuses to start without it in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Your admin login |
| `CORS_ORIGINS` | Your Pages origin, e.g. `https://hesamweb5m.github.io` |
| `DATA_DIR` | The mounted volume path |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Render** — [`render.yaml`](render.yaml) is a ready blueprint. Note that Render
only offers persistent disks on paid instance types; on the free tier the menu
resets on every deploy, so treat that as a demo.

**Fly.io** — [`fly.toml`](fly.toml) with a 1GB volume; the file has the exact
commands. Keep it to one machine, since SQLite writes to a single file.

**Railway** — point it at the `server` directory, add a volume mounted at
`/app/data`, and set `DATA_DIR=/app/data`.

**Docker** — anywhere:

```bash
docker build -t menu-backend ./server
docker run -p 1337:1337 \
  -v menu-data:/app/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=... \
  -e ADMIN_EMAIL=you@example.com \
  -e ADMIN_PASSWORD='...' \
  -e CORS_ORIGINS=https://hesamweb5m.github.io \
  menu-backend
```

Once it is live, set the `VITE_API_URL` repository variable to its URL
(Settings → Secrets and variables → Actions → Variables) and re-run the Pages
workflow so the frontend points at it.

## Layout

```
server/
├── src/
│   ├── index.js        Entry point, graceful shutdown, WAL checkpoint
│   ├── app.js          Express app, CORS, error handling
│   ├── config.js       Environment, .env loader, JWT secret resolution
│   ├── db.js           SQLite schema, documentId generation, transactions
│   ├── auth.js         bcrypt, JWT, admin seeding, requireAuth middleware
│   ├── media.js        Uploads, image dimension sniffing, media links
│   ├── serializers.js  Row -> Strapi JSON, category/product lookups
│   ├── strapi.js       { data, meta } envelopes, sort/pagination parsing
│   └── routes/
│       ├── auth.js, categories.js, products.js, upload.js, uploads.js
│       └── helpers.js  Payload unwrapping and field coercion
├── scripts/seed.js     Starter menu using the frontend's own icons
└── test/api.test.js    42 integration tests over real HTTP
```

Sort fields are resolved through an allow-list (`serializers.js`), so a
`?sort=` value can never reach SQL directly.
