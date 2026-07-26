# Burger Boner

One needle, ten degrees. Burgers near you, scored.

## What's here

- **Real map** — Leaflet + OpenStreetMap/CARTO tiles, works anywhere on earth.
- **Find yourself** — the locate button centers the map on you.
- **Auto-discovery** — as the map moves, the app pulls burger joints and burger-suspect
  restaurants from OpenStreetMap into view as light "unclaimed" pins. Tap one to add it
  to the list with the name pre-filled.
- **Pin anything** — the + button drops a pin anywhere for a place OSM doesn't know.
- **Shared scores** — everyone sees everyone's pins, scores, and cosigns once the
  database is connected (see below). Until then the app runs in offline mode
  (device-only, with a banner).

## Local development

```bash
npm install
npm run dev
```

## Deploying on Vercel

1. Push this folder to the GitHub repo (it should be the **repo root**, replacing the
   old `burger-boner-upload` folder).
2. In the Vercel project: Settings → Build & Development — framework **Vite** is
   auto-detected. If "Root Directory" was set to `burger-boner-upload`, clear it.
3. **Database** (makes scores shared): Vercel dashboard → Storage → Create Database →
   **Neon (Postgres)** → connect it to this project. That injects `DATABASE_URL`.
   Redeploy. Tables are created and seeded automatically on first request.

## Where things live

- `src/theme.js` — brand name, colors, fonts, the tier labels. Rename the app in one place.
- `src/discover.js` — the OpenStreetMap query for "suspected burger places".
- `api/spots.js` — the whole backend (one serverless function).
- `src/store.js` — shared-API-with-local-fallback data layer.
