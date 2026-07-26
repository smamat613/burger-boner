// Nearby burger discovery with a three-step fallback chain:
//   1. Our backend (/api/discover) — cached, smart scoring, optional AI judge.
//      Can get rate-limited because cloud IPs are shared.
//   2. Overpass straight from this device — personal IPs rarely get limited.
//   3. Photon (komoot's free OSM search) as a last resort.
// Whatever answers first wins; the app works anywhere on earth.

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const NAME_RX = /burger|patty|smash|whopper|slider|griddle|char.?grill/i

const score = (tags = {}) => {
  const cuisine = (tags.cuisine || '').toLowerCase()
  if (cuisine.includes('burger')) return 1
  if (NAME_RX.test(tags.name || '')) return 0.9
  if (tags.amenity === 'fast_food' && /american|diner|grill/.test(cuisine)) return 0.6
  if (/restaurant|pub/.test(tags.amenity || '') && /american|diner|grill|bbq|steak/.test(cuisine))
    return 0.5
  return 0
}

const fromBackend = async (lat, lng, r) => {
  const res = await fetch(`/api/discover?lat=${lat}&lng=${lng}&r=${r}`)
  if (!res.ok) throw new Error(`discover ${res.status}`)
  return (await res.json()).places || []
}

const fromOverpass = async (lat, lng, r) => {
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
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q) })
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      const seen = new Set()
      return ((await res.json()).elements || [])
        .map((el) => {
          const plat = el.lat ?? el.center?.lat
          const plng = el.lon ?? el.center?.lon
          const tags = el.tags || {}
          if (!tags.name || plat == null) return null
          const key = tags.name.toLowerCase() + '|' + plat.toFixed(3)
          if (seen.has(key)) return null
          seen.add(key)
          const s = score(tags)
          if (s === 0) return null
          return {
            id: `osm-${el.type}-${el.id}`,
            name: tags.name,
            area: tags['addr:city'] || tags['addr:suburb'] || tags['addr:street'] || 'Nearby',
            lat: plat,
            lng: plng,
            score: s,
            suspected: s < 0.9,
          }
        })
        .filter(Boolean)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('overpass failed')
}

const fromPhoton = async (lat, lng, r) => {
  const res = await fetch(
    `https://photon.komoot.io/api?q=burger&lat=${lat}&lon=${lng}&limit=40&location_bias_scale=0.4`,
  )
  if (!res.ok) throw new Error(`photon ${res.status}`)
  const data = await res.json()
  const dist = (a, b, c, d) => {
    const dy = (a - c) * 111320
    const dx = (b - d) * 111320 * Math.cos((a * Math.PI) / 180)
    return Math.hypot(dx, dy)
  }
  return (data.features || [])
    .map((f) => {
      const p = f.properties || {}
      const [plng, plat] = f.geometry?.coordinates || []
      if (!p.name || plat == null) return null
      if (dist(lat, lng, plat, plng) > r * 1.5) return null
      if (!/fast_food|restaurant|pub|bar/.test(`${p.osm_value} ${p.osm_key}`)) return null
      return {
        id: `osm-${p.osm_type}-${p.osm_id}`,
        name: p.name,
        area: p.city || p.district || p.street || 'Nearby',
        lat: plat,
        lng: plng,
        score: NAME_RX.test(p.name) ? 0.9 : 0.5,
        suspected: !NAME_RX.test(p.name),
      }
    })
    .filter(Boolean)
}

export async function findNearbyBurgers({ lat, lng }, radiusM) {
  const r = radiusM || 4000
  for (const source of [fromBackend, fromOverpass, fromPhoton]) {
    try {
      const places = await source(lat, lng, r)
      if (places.length) return places
    } catch {
      /* fall through to the next source */
    }
  }
  return []
}
