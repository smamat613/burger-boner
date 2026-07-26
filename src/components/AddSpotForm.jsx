import { useState } from 'react'
import { C, F_DISPLAY, F_MONO, COMIC_SHADOW } from '../theme.js'
import { IconPin } from './icons.jsx'

export function AddSpotForm({ ll, prefill, onSave }) {
  const [name, setName] = useState(prefill?.name || '')
  const [area, setArea] = useState(prefill?.area || '')
  const [pitch, setPitch] = useState('')
  const inputStyle = { border: `2px solid ${C.char}`, background: C.paper, color: C.char }
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-3"
        style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.7 }}
      >
        <IconPin size={14} />
        {ll.lat.toFixed(4)}, {ll.lng.toFixed(4)}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Place name"
        className="w-full px-3 py-2 rounded mb-2"
        style={inputStyle}
      />
      <input
        value={area}
        onChange={(e) => setArea(e.target.value)}
        placeholder="Neighborhood"
        className="w-full px-3 py-2 rounded mb-2"
        style={inputStyle}
      />
      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        rows={2}
        placeholder="Why people should go — and what to order"
        className="w-full px-3 py-2 rounded"
        style={{ ...inputStyle, fontSize: 14 }}
      />
      <button
        disabled={!name.trim()}
        onClick={() => onSave(name.trim(), area.trim() || 'Nearby', pitch.trim(), ll.lat, ll.lng)}
        className="w-full mt-3 py-3 rounded"
        style={{
          background: name.trim() ? C.ketchup : C.paperDeep,
          color: name.trim() ? C.paper : C.ink,
          fontFamily: F_DISPLAY,
          fontSize: 20,
          letterSpacing: '0.04em',
          border: `3px solid ${C.char}`,
          boxShadow: name.trim() ? COMIC_SHADOW : 'none',
        }}
      >
        ADD TO THE LIST
      </button>
    </div>
  )
}
