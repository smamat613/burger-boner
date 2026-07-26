import { useEffect, useRef, useState } from 'react'
import { C, F_DISPLAY, F_MONO } from '../theme.js'
import { IconSearch, IconX } from './icons.jsx'

// Type a place name → Photon (free OpenStreetMap geocoder) pulls the address →
// pick a result → the map flies there and the pin form opens pre-filled.
export function SearchBar({ near, onPick }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const tRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    clearTimeout(tRef.current)
    if (q.trim().length < 3) {
      setResults([])
      return
    }
    tRef.current = setTimeout(async () => {
      setBusy(true)
      try {
        const bias = near ? `&lat=${near.lat}&lon=${near.lng}&location_bias_scale=0.3` : ''
        const res = await fetch(
          `https://photon.komoot.io/api?q=${encodeURIComponent(q.trim())}&limit=6${bias}`,
        )
        const data = await res.json()
        setResults(
          (data.features || [])
            .map((f) => {
              const p = f.properties || {}
              const [lng, lat] = f.geometry?.coordinates || []
              if (!p.name || lat == null) return null
              return {
                name: p.name,
                address: [p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street, p.city || p.district, p.state]
                  .filter(Boolean)
                  .join(', '),
                area: p.city || p.district || p.suburb || 'Nearby',
                lat,
                lng,
              }
            })
            .filter(Boolean),
        )
      } catch {
        setResults([])
      } finally {
        setBusy(false)
      }
    }, 350)
    return () => clearTimeout(tRef.current)
  }, [q, near])

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-3 left-3 flex items-center justify-center rounded-full"
        style={{
          width: 44,
          height: 44,
          background: C.char,
          color: C.mustard,
          border: `3px solid ${C.mustard}`,
          zIndex: 500,
        }}
        aria-label="Search for a place"
      >
        <IconSearch size={19} />
      </button>
    )

  return (
    <div className="absolute top-3 left-3 right-3" style={{ zIndex: 600 }}>
      <div
        className="flex items-center gap-2 px-3 rounded"
        style={{ background: C.paper, border: `3px solid ${C.char}` }}
      >
        <IconSearch size={16} style={{ color: C.ink }} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a burger place or address"
          className="flex-1 py-3 outline-none"
          style={{ background: 'transparent', color: C.char, fontSize: 15 }}
        />
        <button
          onClick={() => {
            setOpen(false)
            setQ('')
            setResults([])
          }}
          aria-label="Close search"
          style={{ color: C.char }}
        >
          <IconX size={18} />
        </button>
      </div>
      {(results.length > 0 || busy) && (
        <div
          className="mt-1 rounded overflow-hidden"
          style={{ background: C.paper, border: `3px solid ${C.char}` }}
        >
          {busy && results.length === 0 && (
            <div className="px-3 py-2" style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.6 }}>
              SEARCHING…
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false)
                setQ('')
                setResults([])
                onPick(r)
              }}
              className="w-full px-3 py-2 text-left"
              style={{ borderTop: i ? `1px solid ${C.paperDeep}` : 'none' }}
            >
              <span className="block" style={{ fontFamily: F_DISPLAY, fontSize: 17, color: C.char }}>
                {r.name}
              </span>
              {r.address && (
                <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.ink, opacity: 0.65 }}>
                  {r.address.toUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
