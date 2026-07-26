import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { C, scoreColor, avgScore } from '../theme.js'
import { DETROIT } from '../seeds.js'

// Mini needle-dial pin, drawn as an inline SVG divIcon
function pinHtml(score, name, discovered) {
  const color = discovered ? C.ink : scoreColor(score)
  const rot = score == null ? 128 : 180 - score * 18
  const dash = score == null ? 'stroke-dasharray="3 2.5"' : ''
  const ring = discovered ? `stroke-dasharray="4 3"` : ''
  // big, readable average-score badge on the pin itself
  const badge =
    score == null
      ? ''
      : `<g>
          <circle cx="36" cy="33" r="12" fill="${scoreColor(score)}" stroke="${C.paper}" stroke-width="2.5"/>
          <text x="36" y="37.5" text-anchor="middle" font-family="Impact, 'Arial Narrow Bold', sans-serif" font-size="13" font-weight="bold" fill="${C.paper}">${score.toFixed(1)}</text>
        </g>`
  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px)">
      <svg width="50" height="48" viewBox="0 0 50 48">
        <circle cx="19" cy="19" r="16" fill="${C.paper}" stroke="${discovered ? C.ink : C.char}" stroke-width="2.5" ${ring}/>
        <line x1="10" y1="19" x2="23" y2="19" stroke="${C.ink}" opacity="0.3" stroke-width="1.5"/>
        <g transform="rotate(${rot} 19 19)">
          <line x1="19" y1="19" x2="19" y2="7" stroke="${color}" stroke-width="4" stroke-linecap="round" ${dash}/>
        </g>
        <circle cx="19" cy="19" r="2.6" fill="${color}"/>
        ${badge}
      </svg>
      <span class="bb-pin-label" style="${discovered ? 'opacity:0.75' : ''}">${name
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</span>
    </div>`
}

export function MapView({
  spots,
  discovered,
  onPick,
  onPickDiscovered,
  dropMode,
  onDrop,
  focus,
  userPos,
  onViewChange,
}) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const userRef = useRef(null)
  const cbRef = useRef({})
  cbRef.current = { onPick, onPickDiscovered, onDrop, onViewChange, dropMode }

  // init once
  useEffect(() => {
    const map = L.map(elRef.current, {
      center: [DETROIT.lat, DETROIT.lng],
      zoom: 11,
      zoomControl: false,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (e) => {
      if (cbRef.current.dropMode) cbRef.current.onDrop({ lat: e.latlng.lat, lng: e.latlng.lng })
    })
    map.on('moveend', () => {
      const c = map.getCenter()
      const b = map.getBounds()
      // radius that covers what's actually on screen (capped server-side at 15 km)
      const radius = Math.min(15000, map.distance(b.getNorthWest(), b.getSouthEast()) / 2)
      cbRef.current.onViewChange?.({ lat: c.lat, lng: c.lng, radius })
    })
    mapRef.current = map
    return () => map.remove()
  }, [])

  // pins
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    spots.forEach((s) => {
      const m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className: 'bb-pin',
          html: pinHtml(avgScore(s), s.name, false),
          iconSize: [50, 62],
          iconAnchor: [19, 19],
        }),
      })
      m.on('click', () => !cbRef.current.dropMode && cbRef.current.onPick(s))
      layer.addLayer(m)
    })
    const have = new Set(spots.map((s) => s.name.toLowerCase() + '|' + s.lat.toFixed(3)))
    ;(discovered || []).forEach((d) => {
      if (have.has(d.name.toLowerCase() + '|' + d.lat.toFixed(3))) return
      const m = L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: 'bb-pin',
          html: pinHtml(null, d.name, true),
          iconSize: [50, 62],
          iconAnchor: [19, 19],
        }),
      })
      m.on('click', () => !cbRef.current.dropMode && cbRef.current.onPickDiscovered(d))
      layer.addLayer(m)
    })
  }, [spots, discovered])

  // fly to a focused spot
  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.flyTo([focus.lat, focus.lng], Math.max(mapRef.current.getZoom(), 14), {
        duration: 0.8,
      })
    }
  }, [focus])

  // user location dot
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (userRef.current) {
      userRef.current.remove()
      userRef.current = null
    }
    if (userPos) {
      userRef.current = L.circleMarker([userPos.lat, userPos.lng], {
        radius: 7,
        color: C.paper,
        weight: 2.5,
        fillColor: '#2E6FD8',
        fillOpacity: 1,
      }).addTo(map)
      map.flyTo([userPos.lat, userPos.lng], 14, { duration: 0.8 })
    }
  }, [userPos])

  return <div ref={elRef} className="absolute inset-0" style={{ zIndex: 0 }} />
}
