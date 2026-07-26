// Shared backend: one Vercel serverless function backed by Postgres (Neon via
// the Vercel Marketplace). GET returns every spot with ratings + cosigns;
// POST mutates ({action: 'add_spot' | 'rate' | 'cosign'}). The table is
// created on first use, and the original Detroit starter list is seeded once.
import { neon } from '@neondatabase/serverless'

const SEEDS = [
  ['s1', 'Green Dot Stables', 'Corktown', 42.3285, -83.067],
  ['s2', 'Mercury Burger Bar', 'Michigan Ave', 42.33, -83.07],
  ['s3', 'Grey Ghost', 'Brush Park', 42.3465, -83.057],
  ['s4', 'Redcoat Tavern', 'Royal Oak', 42.509, -83.149],
  ['s5', "Miller's Bar", 'Dearborn', 42.306, -83.227],
  ['s6', 'Telway', 'West Michigan Ave', 42.333, -83.115],
]

let ready
async function setup(sql) {
  if (!ready) {
    ready = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS spots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        area TEXT NOT NULL DEFAULT '',
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        pitch TEXT NOT NULL DEFAULT '',
        by_name TEXT NOT NULL DEFAULT 'House',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS ratings (
        id BIGSERIAL PRIMARY KEY,
        spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
        by_name TEXT NOT NULL,
        score REAL NOT NULL,
        order_text TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
      await sql`CREATE TABLE IF NOT EXISTS cosigns (
        spot_id TEXT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
        by_name TEXT NOT NULL,
        PRIMARY KEY (spot_id, by_name)
      )`
      // device identity columns (safe to re-run)
      await sql`ALTER TABLE spots ADD COLUMN IF NOT EXISTS device_id TEXT`
      await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS device_id TEXT`
      await sql`ALTER TABLE cosigns ADD COLUMN IF NOT EXISTS device_id TEXT`
      const [{ n }] = await sql`SELECT count(*)::int AS n FROM spots`
      if (n === 0) {
        for (const [id, name, area, lat, lng] of SEEDS) {
          await sql`INSERT INTO spots (id, name, area, lat, lng)
                    VALUES (${id}, ${name}, ${area}, ${lat}, ${lng})
                    ON CONFLICT (id) DO NOTHING`
        }
      }
    })()
  }
  return ready
}

async function allSpots(sql) {
  const spots = await sql`SELECT * FROM spots ORDER BY created_at`
  const ratings = await sql`SELECT * FROM ratings ORDER BY at DESC`
  const cosigns = await sql`SELECT * FROM cosigns`
  return spots.map((s) => ({
    id: s.id,
    name: s.name,
    area: s.area,
    lat: s.lat,
    lng: s.lng,
    pitch: s.pitch,
    by: s.by_name,
    ratings: ratings
      .filter((r) => r.spot_id === s.id)
      .map((r) => ({
        by: r.by_name,
        score: r.score,
        order: r.order_text,
        note: r.note,
        at: new Date(r.at).getTime(),
      })),
    cosigns: cosigns.filter((c) => c.spot_id === s.id).map((c) => c.by_name),
  }))
}

const clip = (v, max) => String(v ?? '').slice(0, max)

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    res.status(503).json({ error: 'database not configured' })
    return
  }
  const sql = neon(url)
  try {
    await setup(sql)
    if (req.method === 'POST') {
      const b = req.body || {}
      const by = clip(b.by, 40) || 'Anonymous'
      const dev = clip(b.deviceId, 64) || null

      // simple abuse brake: max 25 actions per device per 10 minutes
      if (dev) {
        const [{ n }] = await sql`
          SELECT (SELECT count(*) FROM ratings WHERE device_id = ${dev} AND at > now() - interval '10 minutes')
               + (SELECT count(*) FROM spots  WHERE device_id = ${dev} AND created_at > now() - interval '10 minutes')
               AS n`
        if (Number(n) >= 25) {
          res.status(429).json({ error: 'slow down' })
          return
        }
      }
      if (b.action === 'add_spot') {
        const lat = Number(b.lat)
        const lng = Number(b.lng)
        if (!b.name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          res.status(400).json({ error: 'bad spot' })
          return
        }
        await sql`INSERT INTO spots (id, name, area, lat, lng, pitch, by_name, device_id)
                  VALUES (${clip(b.id, 64) || 'u' + Date.now()}, ${clip(b.name, 80)},
                          ${clip(b.area, 60) || 'Nearby'}, ${lat}, ${lng},
                          ${clip(b.pitch, 200)}, ${by}, ${dev})
                  ON CONFLICT (id) DO NOTHING`
      } else if (b.action === 'rate') {
        const score = Number(b.score)
        if (!b.spotId || !Number.isFinite(score) || score < 0 || score > 10) {
          res.status(400).json({ error: 'bad rating' })
          return
        }
        // one score per device per spot: re-scoring replaces the old score
        if (dev) {
          await sql`DELETE FROM ratings WHERE spot_id = ${clip(b.spotId, 64)} AND device_id = ${dev}`
        }
        await sql`INSERT INTO ratings (spot_id, by_name, score, order_text, note, device_id)
                  VALUES (${clip(b.spotId, 64)}, ${by}, ${score},
                          ${clip(b.order, 80)}, ${clip(b.note, 240)}, ${dev})`
      } else if (b.action === 'cosign') {
        const id = clip(b.spotId, 64)
        // toggle by device when we have one (name is just the display label)
        const del = dev
          ? await sql`DELETE FROM cosigns WHERE spot_id = ${id} AND device_id = ${dev} RETURNING 1`
          : await sql`DELETE FROM cosigns WHERE spot_id = ${id} AND by_name = ${by} RETURNING 1`
        if (del.length === 0) {
          await sql`INSERT INTO cosigns (spot_id, by_name, device_id) VALUES (${id}, ${by}, ${dev})
                    ON CONFLICT DO NOTHING`
        }
      } else {
        res.status(400).json({ error: 'unknown action' })
        return
      }
    }
    res.status(200).json({ spots: await allSpots(sql) })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
}
