// SEO page for a single spot: server-rendered HTML with schema.org Restaurant
// + AggregateRating markup (the code behind Google's ★ snippets), OG tags for
// link previews, and a button into the app. Routed via /spot/<id>/<slug>.
import { neon } from '@neondatabase/serverless'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const TIERS = [
  [2, 'FLACCID'],
  [4, 'BARELY STIRRING'],
  [6, 'HALF MAST'],
  [7.5, 'FIRM'],
  [9, 'FULL MAST'],
  [10.1, 'ROCK HARD'],
]
const tierLabel = (s) => (s == null ? 'UNSCORED' : TIERS.find(([m]) => s < m)[1])

export default async function handler(req, res) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  const id = String(req.query.path || req.query.id || '').split('/')[0]
  if (!url || !id) {
    res.status(404).send('Not found')
    return
  }
  const sql = neon(url)
  try {
    const [spot] = await sql`SELECT * FROM spots WHERE id = ${id}`
    if (!spot) {
      res.status(404).send('Not found')
      return
    }
    const ratings = await sql`SELECT * FROM ratings WHERE spot_id = ${id} ORDER BY at DESC LIMIT 50`
    const avg = ratings.length ? ratings.reduce((a, r) => a + r.score, 0) / ratings.length : null
    const slug = slugify(spot.name)
    const canonical = `https://www.burgerboner.com/spot/${spot.id}/${slug}`
    const title = avg
      ? `${spot.name} — ${avg.toFixed(1)}/10 on Burger Boner`
      : `${spot.name} — on the list at Burger Boner`
    const desc = avg
      ? `${spot.name} in ${spot.area} scores ${avg.toFixed(1)} out of 10 (${tierLabel(avg)}) from ${ratings.length} burger ${ratings.length === 1 ? 'score' : 'scores'} on Burger Boner.`
      : `${spot.name} in ${spot.area} is on the Burger Boner list. Been there? Score it.`

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: spot.name,
      servesCuisine: 'Burgers',
      url: canonical,
      address: { '@type': 'PostalAddress', addressLocality: spot.area },
      geo: { '@type': 'GeoCoordinates', latitude: spot.lat, longitude: spot.lng },
    }
    if (avg != null) {
      ld.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(avg.toFixed(1)),
        bestRating: 10,
        worstRating: 0,
        ratingCount: ratings.length,
      }
      ld.review = ratings
        .filter((r) => r.note)
        .slice(0, 5)
        .map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.by_name },
          reviewRating: { '@type': 'Rating', ratingValue: r.score, bestRating: 10, worstRating: 0 },
          reviewBody: r.note,
        }))
    }

    const reviewsHtml = ratings
      .slice(0, 15)
      .map(
        (r) => `
      <div class="row">
        <span class="score">${r.score.toFixed(1)}</span>
        <span><span class="who">${esc(r.by_name.toUpperCase())}${r.order_text ? ' · ' + esc(r.order_text.toUpperCase()) : ''}</span>
        ${r.note ? `<span class="note">${esc(r.note)}</span>` : ''}</span>
      </div>`,
      )
      .join('')

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.png">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
  body{margin:0;background:#F2E9D8;color:#221E1B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
  .wrap{max-width:640px;margin:0 auto;padding:20px}
  header{background:#221E1B;border-bottom:4px solid #E8B430;padding:14px 20px}
  header a{font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:28px;color:#E8B430;text-decoration:none}
  header a span{color:#C8372D;font-size:14px}
  h1{font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:38px;margin:18px 0 2px;line-height:1}
  .tier{font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:24px;color:${avg == null ? '#3A342E' : avg >= 7.5 ? '#4A7C3F' : avg >= 5 ? '#E8B430' : '#C8372D'}}
  .meta{font-family:ui-monospace,Menlo,monospace;font-size:12px;opacity:.65;margin-top:4px}
  .cta{display:block;text-align:center;background:#C8372D;color:#F2E9D8;font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:22px;padding:14px;border-radius:6px;text-decoration:none;margin:22px 0;letter-spacing:.03em}
  .row{display:flex;gap:12px;padding:10px 0;border-top:1px solid #E6D9C0}
  .score{font-family:Impact,'Arial Narrow Bold',sans-serif;font-size:20px;min-width:38px}
  .who{display:block;font-family:ui-monospace,Menlo,monospace;font-size:10px;opacity:.6}
  .note{display:block;font-size:14px;margin-top:2px}
</style>
</head>
<body>
<header><a href="/">BURGER BONER <span>/10</span></a></header>
<div class="wrap">
  <h1>${esc(spot.name)}</h1>
  <div class="tier">${avg == null ? 'UNSCORED — SOMEBODY GO FIRST' : `${avg.toFixed(1)} — ${tierLabel(avg)}`}</div>
  <div class="meta">${esc(spot.area.toUpperCase())} · ${ratings.length} ${ratings.length === 1 ? 'SCORE' : 'SCORES'} · BURGER BONER™</div>
  <a class="cta" href="/?spot=${encodeURIComponent(spot.id)}">${avg == null ? 'BE THE FIRST TO SCORE IT →' : 'SCORE THIS BURGER →'}</a>
  ${reviewsHtml}
</div>
</body>
</html>`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')
    res.status(200).send(html)
  } catch (e) {
    res.status(500).send('Something went wrong')
  }
}
