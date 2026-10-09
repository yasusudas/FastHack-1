# FastHack

A two-part translator scaffold.

- `web/` — Vite vanilla-JS front end
- `server/` — Node/Express API on port 3000

## Running

Two terminals.

**Server** (port 3000):

```bash
cd server
npm install
npm run dev     # or: npm start
```

**Web** (port 5173):

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173.

Vite proxies `/api/*` to `http://localhost:3000/*` (the `/api` prefix is
stripped), so the browser's `POST /api/translate` reaches the server's
`POST /translate`. No CORS setup needed in dev.

## API

`POST /translate`

```jsonc
// request
{ "text": "おはよう", "direction": "ja-en", "kansaiBen": false }

// response
{ "translation": "[ja-en stub] おはよう" }
```

- `text` — required, non-empty
- `direction` — `"ja-en"` or `"en-ja"`
- `kansaiBen` — boolean, optional

The handler is currently a **stub** that echoes the input with the options
labeled. Replace the body of the `/translate` route in `server/index.js` with a
real translation call.

Also available: `GET /health` → `{ "ok": true }`

## Environment

Copy `server/.env.example` to `server/.env` for local config (`PORT`). `.env` is
gitignored.
