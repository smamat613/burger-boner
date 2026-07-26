import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_NAME, APP_TAG, C, F_DISPLAY, F_MONO, F_BODY, avgScore } from './theme.js'
import { store } from './store.js'
import { findNearbyBurgers } from './discover.js'
import { DETROIT } from './seeds.js'
import { MapView } from './components/MapView.jsx'
import { Meter } from './components/Gauge.jsx'
import { Sheet } from './components/Sheet.jsx'
import { SpotSheet } from './components/SpotSheet.jsx'
import { ScaleSheet } from './components/ScaleSheet.jsx'
import { AddSpotForm } from './components/AddSpotForm.jsx'
import { SearchBar } from './components/SearchBar.jsx'
import { RankedList } from './components/RankedList.jsx'
import { RecsList } from './components/RecsList.jsx'
import { IconMap, IconRank, IconRecs, IconPlus, IconX, IconInfo, IconLocate } from './components/icons.jsx'

export default function App() {
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)
  const [tab, setTab] = useState('map')
  const [selected, setSelected] = useState(null)
  const [scoring, setScoring] = useState(false)
  const [dropMode, setDropMode] = useState(false)
  const [dropLL, setDropLL] = useState(null) // {lat,lng, prefill?}
  const [name, setName] = useState('')
  const [focus, setFocus] = useState(null)
  const [showScale, setShowScale] = useState(false)
  const [discovered, setDiscovered] = useState([])
  const [rankScope, setRankScope] = useState('near') // 'near' = the map area you're looking at
  const [userPos, setUserPos] = useState(null)
  const [locating, setLocating] = useState(false)
  const searchedRef = useRef([]) // areas already swept for nearby burgers
  const debounceRef = useRef(null)
  const centerRef = useRef(DETROIT) // last map center, used to bias place search

  useEffect(() => {
    ;(async () => {
      setName(store.getName())
      const list = await store.load()
      setSpots(list)
      if (!store.shared)
        setBanner('Offline mode — scores stay on this phone until the shared database is set up.')
      setLoading(false)
      sweep(DETROIT, 12000) // pull suspected burger spots for the opening view right away
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const me = () => name.trim() || 'Anonymous'

  const saveName = (n) => {
    setName(n)
    store.setName(n)
  }

  // ---- discovery: pull burger-suspect places into the map as it moves ----
  const sweep = useCallback(async (center, radiusM) => {
    const done = searchedRef.current.some(
      (p) => Math.abs(p.lat - center.lat) < 0.02 && Math.abs(p.lng - center.lng) < 0.02,
    )
    if (done) return
    searchedRef.current.push(center)
    try {
      const found = await findNearbyBurgers(center, radiusM)
      setDiscovered((prev) => {
        const ids = new Set(prev.map((d) => d.id))
        return [...prev, ...found.filter((d) => !ids.has(d.id))]
      })
    } catch {
      /* Overpass down or rate-limited — quietly skip this sweep */
    }
  }, [])

  const onViewChange = useCallback(
    (center) => {
      centerRef.current = center
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => sweep(center), 900)
    },
    [sweep],
  )

  const locate = () => {
    if (!navigator.geolocation) {
      setBanner("This browser can't share your location.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(ll)
        setLocating(false)
        sweep(ll)
      },
      (err) => {
        setLocating(false)
        setBanner(
          err && err.code === 1
            ? 'Location permission is off for this site. iPhone: aA menu → Website Settings → Location → Allow (and check Settings → Privacy → Location Services → Safari). Or just pan the map to where you are — spots load anywhere.'
            : "Couldn't get a location fix — pan the map to where you are; spots load anywhere.",
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ---- mutations (server is source of truth; local fallback inside store) ----
  const addRating = async (spotId, score, order, note) => {
    const next = await store.rate(spotId, {
      by: me(),
      score,
      order: order.trim(),
      note: note.trim(),
      at: Date.now(),
    })
    setSpots(next)
    setSelected(next.find((s) => s.id === spotId))
    setScoring(false)
  }

  const addSpot = async (spotName, area, pitch, lat, lng) => {
    const next = await store.addSpot({
      id: dropLL?.prefill?.id || `u${Date.now()}`,
      name: spotName,
      area,
      pitch,
      by: me(),
      lat,
      lng,
    })
    setSpots(next)
    setDiscovered((prev) => prev.filter((d) => d.id !== dropLL?.prefill?.id))
    setDropLL(null)
    setDropMode(false)
    setTab('recs')
  }

  const toggleCosign = async (spotId) => {
    setSpots(await store.cosign(spotId, me()))
  }

  const openSpot = (spot, score = false) => {
    setSelected(spot)
    setScoring(score)
    setTab('map')
    setFocus({ lat: spot.lat, lng: spot.lng })
  }

  // ranked list, scoped to the map area you're looking at (~25 km) or everywhere
  const kmBetween = (a, b) => {
    const dy = (a.lat - b.lat) * 111.32
    const dx = (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180)
    return Math.hypot(dx, dy)
  }
  const anchor = userPos || centerRef.current
  const rankedAll = spots.filter((s) => s.ratings.length).sort((a, b) => avgScore(b) - avgScore(a))
  const rankedNear = rankedAll.filter((s) => kmBetween(s, anchor) <= 25)
  const ranked = rankScope === 'near' ? rankedNear : rankedAll
  const recs = spots
    .filter((s) => !s.ratings.length)
    .sort((a, b) => b.cosigns.length - a.cosigns.length || b.id.localeCompare(a.id))

  if (loading)
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: C.paper }}>
        <Meter score={10} size={110} />
      </div>
    )

  const tabs = [
    ['map', 'MAP', IconMap],
    ['rank', 'RANKED', IconRank],
    ['recs', 'RECS', IconRecs],
  ]

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: C.paper, fontFamily: F_BODY }}
    >
      <header
        className="px-4 py-3 shrink-0 flex items-center justify-between"
        style={{ background: C.char, borderBottom: `4px solid ${C.mustard}` }}
      >
        <div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: F_DISPLAY, fontSize: 34, color: C.mustard, letterSpacing: '0.01em', lineHeight: 1 }}>
              {APP_NAME}
            </span>
            <span style={{ fontFamily: F_DISPLAY, fontSize: 15, color: C.ketchup, lineHeight: 1 }}>
              {APP_TAG}
            </span>
          </div>
          <div style={{ fontFamily: F_MONO, fontSize: 10, color: C.paperDeep, opacity: 0.7, marginTop: 4 }}>
            {store.shared ? 'LIVE' : 'THIS PHONE ONLY'} · {rankedAll.length} SCORED · {recs.length} ON THE LIST
          </div>
        </div>
        <button
          onClick={() => setShowScale(true)}
          className="p-2 rounded shrink-0"
          style={{ border: `2px solid ${C.mustard}`, color: C.mustard }}
          aria-label="How the scale works"
        >
          <IconInfo size={18} />
        </button>
      </header>

      {banner && (
        <button
          className="px-4 py-2 text-left"
          style={{ background: C.ketchup, color: C.paper, fontSize: 12 }}
          onClick={() => setBanner(null)}
        >
          {banner}
        </button>
      )}

      {!name && (
        <div className="px-4 py-3" style={{ background: C.mustard, borderBottom: `2px solid ${C.char}` }}>
          <label style={{ fontFamily: F_MONO, fontSize: 11, color: C.char }}>WHO'S EATING?</label>
          <input
            className="w-full mt-1 px-3 py-2 rounded"
            style={{ border: `2px solid ${C.char}`, background: C.paper, color: C.char }}
            placeholder="Your name"
            onBlur={(e) => e.target.value.trim() && saveName(e.target.value.trim())}
          />
        </div>
      )}

      <main className="flex-1 relative overflow-hidden">
        {tab === 'map' && (
          <>
            <MapView
              spots={spots}
              discovered={discovered}
              onPick={(s) => {
                setSelected(s)
                setScoring(false)
              }}
              onPickDiscovered={(d) =>
                setDropLL({ lat: d.lat, lng: d.lng, prefill: d })
              }
              dropMode={dropMode}
              onDrop={(ll) => setDropLL(ll)}
              focus={focus}
              userPos={userPos}
              onViewChange={onViewChange}
            />
            <SearchBar
              near={userPos || centerRef.current}
              onPick={(r) => {
                setFocus({ lat: r.lat, lng: r.lng })
                setDropLL({
                  lat: r.lat,
                  lng: r.lng,
                  prefill: { name: r.name, area: r.area },
                })
              }}
            />
            {dropMode && !dropLL && (
              <div
                className="absolute top-3 left-1/2 px-4 py-2 rounded-full"
                style={{
                  transform: 'translateX(-50%)',
                  background: C.char,
                  color: C.mustard,
                  fontFamily: F_MONO,
                  fontSize: 11,
                  zIndex: 500,
                }}
              >
                TAP WHERE IT SITS
              </div>
            )}
            <button
              onClick={locate}
              className="absolute bottom-24 right-5 flex items-center justify-center rounded-full"
              style={{
                width: 46,
                height: 46,
                background: C.paper,
                color: C.char,
                border: `3px solid ${C.char}`,
                zIndex: 500,
                opacity: locating ? 0.5 : 1,
              }}
              aria-label="Center on my location"
            >
              <IconLocate size={20} />
            </button>
            <button
              onClick={() => {
                setDropMode(!dropMode)
                setDropLL(null)
                setSelected(null)
              }}
              className="absolute bottom-5 right-5 flex items-center justify-center rounded-full"
              style={{
                width: 56,
                height: 56,
                background: dropMode ? C.ketchup : C.char,
                color: C.mustard,
                border: `3px solid ${C.mustard}`,
                zIndex: 500,
              }}
              aria-label={dropMode ? 'Cancel' : 'Recommend a spot'}
            >
              {dropMode ? <IconX size={22} /> : <IconPlus size={24} />}
            </button>
          </>
        )}
        {tab === 'rank' && (
          <RankedList
            spots={ranked}
            onPick={(s) => openSpot(s)}
            scope={rankScope}
            onScope={setRankScope}
            areaCount={rankedNear.length}
          />
        )}
        {tab === 'recs' && (
          <RecsList spots={recs} me={me()} onCosign={toggleCosign} onScore={(s) => openSpot(s, true)} />
        )}

        {showScale && <ScaleSheet onClose={() => setShowScale(false)} />}

        {dropLL && (
          <Sheet title="PUT SOMEBODY ON" onClose={() => setDropLL(null)}>
            <AddSpotForm ll={dropLL} prefill={dropLL.prefill} onSave={addSpot} />
          </Sheet>
        )}

        {selected && !dropLL && (
          <SpotSheet
            spot={selected}
            scoring={scoring}
            onScoreStart={() => setScoring(true)}
            onScoreCancel={() => setScoring(false)}
            onSubmit={addRating}
            onClose={() => setSelected(null)}
          />
        )}
      </main>

      <nav className="flex shrink-0" style={{ background: C.char, borderTop: `4px solid ${C.mustard}` }}>
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center gap-1 py-2"
            style={{ color: tab === key ? C.mustard : C.paperDeep, opacity: tab === key ? 1 : 0.45 }}
          >
            <Icon size={18} />
            <span style={{ fontFamily: F_MONO, fontSize: 9, letterSpacing: '0.08em' }}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
