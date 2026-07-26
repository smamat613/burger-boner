// Nearby burger discovery via OpenStreetMap's Overpass API (free, no key).
// Finds burger joints around a point so the app works anywhere on earth.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export async function findNearbyBurgers({ lat, lng }, radiusM = 4000) {
  const q = `
[out:json][timeout:20];
(
  nwr["cuisine"~"burger"](around:${radiusM},${lat},${lng});
  nwr["amenity"~"fast_food|restaurant"]["name"~"[Bb]urger"](around:${radiusM},${lat},${lng});
);
out center 60;`
  let lastErr
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q) })
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      const data = await res.json()
      const seen = new Set()
      return (data.elements || [])
        .map((el) => {
          const lat2 = el.lat ?? el.center?.lat
          const lng2 = el.lon ?? el.center?.lon
          const name = el.tags?.name
          if (!name || lat2 == null) return null
          const key = name.toLowerCase() + '|' + lat2.toFixed(3)
          if (seen.has(key)) return null
          seen.add(key)
          return {
            id: `osm-${el.type}-${el.id}`,
            name,
            area:
              el.tags['addr:city'] ||
              el.tags['addr:suburb'] ||
              el.tags['addr:street'] ||
              'Nearby',
            lat: lat2,
            lng: lng2,
          }
        })
        .filter(Boolean)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('discovery failed')
}
