# Atlass Cafe menu

A digital cafe menu with an admin panel. React + Vite frontend, Express + SQLite
backend.

- `/` — landing page
- `/menu` — the menu, grouped by category
- `/admin` — admin login
- `/manage` — add, edit, reorder and delete products and categories

```
.
├── src/            React frontend (Vite, Tailwind, React Router)
├── public/         Fonts, icons, category artwork
└── server/         REST API (see server/README.md)
```

## Running locally

Two terminals. Backend first, because the frontend has nothing to show without
it:

```bash
cd server && npm install && npm run seed && npm run dev
```

```bash
npm install && npm run dev
```

Then open <http://localhost:5173>. The backend listens on port 1337, which is
what the frontend uses when `VITE_API_URL` is unset.

`npm run seed` fills the menu with 7 categories and 20 products so the pages
have real content. The admin password is printed to the backend console on first
start — see [`server/README.md`](server/README.md).

## Configuration

Copy `.env.example` to `.env.local` for the frontend and `server/.env.example`
to `server/.env` for the backend. The only frontend variable that matters is:

```
VITE_API_URL=http://localhost:1337
```

## Deploying

The two halves deploy separately, because **GitHub Pages only serves static
files and cannot run the API**.

**Frontend → GitHub Pages.** [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml)
builds and publishes on every push to `main`. Before the first run:

1. Settings → Pages → Source → **GitHub Actions**
2. Settings → Secrets and variables → Actions → Variables → add
   `VITE_API_URL` pointing at the deployed backend
   (e.g. `https://menu-backend.onrender.com`)

Without step 2 the site builds but shows an empty menu, since it would be
looking for `localhost:1337` on the visitor's own machine. The workflow logs a
warning if the variable is missing.

The workflow copies `index.html` to `404.html`, which is what makes a refresh on
`/menu` work — GitHub Pages has no rewrite rules of its own.

**Backend → any Node host.** Render, Fly.io and Railway configs are in
`server/`, along with a Dockerfile. The one requirement is a persistent volume
mounted at `DATA_DIR`: the SQLite file holds the menu *and* the uploaded images,
so without it the content resets on every deploy. Full instructions in
[`server/README.md`](server/README.md).

## Tests

```bash
cd server && npm test
```

42 integration tests run the API over real HTTP against a throwaway database.
They assert the exact field shapes each frontend component reads, so a failure
there means a broken page rather than just a broken test.
