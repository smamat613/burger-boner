// Nearby burger discovery, server-side. Queries OpenStreetMap's Overpass API
// (with mirror fallback) and scores each place as a confirmed or *suspected*
// burger spot. If ANTHROPIC_API_KEY is set in the environment, an AI pass
// (Claude) re-judges the ambiguous candidates for smarter suggestions.
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const NAME_RX = /burger|patty|smash|whopper|slider|griddle|char.?grill/i

function heuristicScore(tags = {}) {
  const cuisine = (tags.cuisine || '').toLowerCase()
  const name = tags.name || ''
  if (cuisine.includes('burger')) return 1 // literally a burger place
  if (NAME_RX.test(name)) return 0.9 // the name gives it away
  if (tags.amenity === 'fast_food' && /american|diner|grill/.test(cuisine)) return 0.6
  if (tags.amenity === 'restaurant' && /american|diner|grill|bbq|steak/.test(cuisine)) return 0.5
  if (tags.amenity === 'pub' && /american|grill|burger/.test(cuisine)) return 0.5
  return 0
}

async function queryOverpass(lat, lng, r) {
  const q = `
[out:json][timeout:20];
(
  nwr["cuisine"~"burger",i](around:${r},${lat},${lng});
  nwr["name"]["amenity"~"^(fast_food|restaurant|pub|bar)$"]["name"~"burger|patty|smash|griddle",i](around:${r},${lat},${lng});
  nwr["amenity"="fast_food"]["cuisine"~"american|diner|grill",i](around:${r},${lat},${lng});
  nwr["amenity"="restaurant"]["cuisine"~"american|diner|grill|bbq|steak",i](around:${r},${lat},${lng});
);
out center 120;`
  let lastErr
  for (const url of MIRRORS) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 12000)
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: ctrl.signal,
      })
      clearTimeout(t)
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      return (await res.json()).elements || []
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('all overpass mirrors failed')
}

// Optional AI pass: ask Claude which ambiguous places likely serve a real burger.
async function aiJudge(candidates) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || candidates.length === 0) return null
  try {
    const listing = candidates
      .map((c, i) => `${i}: ${c.name} (${c.tagsSummary})`)
      .join('\n')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-haiku-4-5',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `These are restaurants near a user of a burger-rating app. Reply ONLY with a JSON array of the index numbers of places that most likely serve a proper burger:\n${listing}`,
          },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data.content?.[0]?.text || '[]'
    const idx = JSON.parse(text.match(/\[[\d,\s]*\]/)?.[0] || '[]')
    return new Set(idx)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const r = Math.min(Number(req.query.r) || 4000, 15000)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: 'lat/lng required' })
    return
  }
  try {
    const elements = await queryOverpass(lat, lng, r)
    const seen = new Set()
    let places = elements
      .map((el) => {
        const plat = el.lat ?? el.center?.lat
        const plng = el.lon ?? el.center?.lon
        const tags = el.tags || {}
        if (!tags.name || plat == null) return null
        const key = tags.name.toLowerCase() + '|' + plat.toFixed(3)
        if (seen.has(key)) return null
        seen.add(key)
        const score = heuristicScore(tags)
        if (score === 0) return null
        return {
          id: `osm-${el.type}-${el.id}`,
          name: tags.name,
          area: tags['addr:city'] || tags['addr:suburb'] || tags['addr:street'] || 'Nearby',
          lat: plat,
          lng: plng,
          score,
          suspected: score < 0.9,
          tagsSummary: `${tags.amenity || ''} ${tags.cuisine || ''}`.trim(),
        }
      })
      .filter(Boolean)

    // AI pass over the "suspected" tier only (confirmed ones don't need judging)
    const ambiguous = places.filter((p) => p.suspected)
    const verdict = await aiJudge(ambiguous)
    if (verdict) {
      const keep = new Set([...verdict].map((i) => ambiguous[i]?.id))
      places = places.filter((p) => !p.suspected || keep.has(p.id))
    }

    places.sort((a, b) => b.score - a.score)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    res.status(200).json({ places: places.slice(0, 60), ai: Boolean(verdict) })
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
}
