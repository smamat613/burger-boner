// Data layer. Talks to the shared API (/api/spots) so everyone sees the same
// pins and scores. If the API isn't reachable (e.g. database not provisioned
// yet, or offline), it falls back to this device's local storage so the app
// still works — it just isn't shared until the backend is up.
import { SEED_SPOTS } from './seeds.js'

const LS_SPOTS = 'burger-spots'
const LS_NAME = 'rater-name'
const LS_DEVICE = 'device-id'

// Anonymous per-phone identity: no login, but one score per person per spot,
// and a handle for moderation later.
export function deviceId() {
  try {
    let id = localStorage.getItem(LS_DEVICE)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'd' + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('')
      localStorage.setItem(LS_DEVICE, id)
    }
    return id
  } catch {
    return null
  }
}

const normalize = (list) =>
  (Array.isArray(list) ? list : []).map((s) => ({
    pitch: '',
    by: 'House',
    ...s,
    lat: Number(s.lat),
    lng: Number(s.lng),
    ratings: (s.ratings || []).map((r) => ({ order: '', note: '', ...r })),
    cosigns: s.cosigns || [],
    links: s.links || [],
  }))

// ---------- local fallback ----------
const localGet = () => {
  try {
    const raw = localStorage.getItem(LS_SPOTS)
    if (raw == null) {
      localStorage.setItem(LS_SPOTS, JSON.stringify(SEED_SPOTS))
      return normalize(SEED_SPOTS)
    }
    return normalize(JSON.parse(raw))
  } catch {
    return normalize(SEED_SPOTS)
  }
}

const localMutate = (fn) => {
  const next = fn(localGet())
  try {
    localStorage.setItem(LS_SPOTS, JSON.stringify(next))
  } catch {
    /* storage blocked — keep going in memory */
  }
  return next
}

// ---------- shared API ----------
async function api(body) {
  const res = await fetch('/api/spots', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`api ${res.status}`)
  const data = await res.json()
  return normalize(data.spots)
}

export const store = {
  shared: false, // true once the API has answered — data is live for everyone

  async load() {
    try {
      const spots = await api()
      this.shared = true
      return spots
    } catch {
      this.shared = false
      return localGet()
    }
  },

  async addSpot(spot) {
    if (this.shared) {
      try {
        return await api({ action: 'add_spot', deviceId: deviceId(), ...spot })
      } catch {
        this.shared = false
      }
    }
    return localMutate((list) =>
      list.some((s) => s.id === spot.id) ? list : [...list, { ...spot, ratings: [], cosigns: [] }],
    )
  },

  async rate(spotId, rating) {
    const dev = deviceId()
    if (this.shared) {
      try {
        return await api({ action: 'rate', spotId, deviceId: dev, ...rating })
      } catch {
        this.shared = false
      }
    }
    return localMutate((list) =>
      list.map((s) =>
        s.id === spotId
          ? {
              ...s,
              // re-scoring replaces this device's previous score
              ratings: [
                { ...rating, deviceId: dev },
                ...s.ratings.filter((r) => !dev || r.deviceId !== dev),
              ],
            }
          : s,
      ),
    )
  },

  async cosign(spotId, by) {
    if (this.shared) {
      try {
        return await api({ action: 'cosign', spotId, by, deviceId: deviceId() })
      } catch {
        this.shared = false
      }
    }
    return localMutate((list) =>
      list.map((s) =>
        s.id === spotId
          ? {
              ...s,
              cosigns: s.cosigns.includes(by)
                ? s.cosigns.filter((n) => n !== by)
                : [...s.cosigns, by],
            }
          : s,
      ),
    )
  },

  async addLink(spotId, url, title, by) {
    if (this.shared) {
      try {
        return await api({ action: 'add_link', spotId, url, title, by, deviceId: deviceId() })
      } catch {
        this.shared = false
      }
    }
    return localMutate((list) =>
      list.map((s) =>
        s.id === spotId
          ? { ...s, links: [{ url, title, by, at: Date.now() }, ...(s.links || [])] }
          : s,
      ),
    )
  },

  getName() {
    try {
      return localStorage.getItem(LS_NAME) || ''
    } catch {
      return ''
    }
  },
  setName(name) {
    try {
      localStorage.setItem(LS_NAME, name)
    } catch {
      /* ignore */
    }
  },
}
