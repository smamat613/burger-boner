// Nearby burger discovery. Calls our own backend (/api/discover), which
// queries OpenStreetMap server-side (no browser CORS problems) and flags
// confirmed vs suspected burger spots — optionally AI-judged.
export async function findNearbyBurgers({ lat, lng }, radiusM) {
  radiusM = radiusM || 4000
  const res = await fetch(`/api/discover?lat=${lat}&lng=${lng}&r=${radiusM}`)
  if (!res.ok) throw new Error(`discover ${res.status}`)
  const data = await res.json()
  return data.places || []
}
