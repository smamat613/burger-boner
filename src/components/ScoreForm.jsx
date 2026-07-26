import { useState } from 'react'
import { C, F_DISPLAY, COMIC_SHADOW, scoreColor, tierLabel } from '../theme.js'
import { Meter } from './Gauge.jsx'

export function ScoreForm({ onSubmit, onCancel }) {
  const [score, setScore] = useState(7)
  const [order, setOrder] = useState('')
  const [note, setNote] = useState('')
  const inputStyle = {
    border: `2px solid ${C.char}`,
    background: C.paper,
    color: C.char,
    fontSize: 14,
  }
  return (
    <div className="mt-4">
      <div className="flex items-center gap-4">
        <Meter score={score} size={92} />
        <div className="flex-1">
          <div style={{ fontFamily: F_DISPLAY, fontSize: 22, color: scoreColor(score), lineHeight: 1 }}>
            {score.toFixed(1)} — {tierLabel(score)}
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={score}
            onChange={(e) => setScore(parseFloat(e.target.value))}
            className="w-full mt-2"
            style={{ accentColor: scoreColor(score) }}
            aria-label="Score"
          />
        </div>
      </div>
      <input
        value={order}
        onChange={(e) => setOrder(e.target.value)}
        placeholder="What you ordered — e.g. double with grilled onions"
        className="w-full mt-3 px-3 py-2 rounded"
        style={inputStyle}
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="One line on the burger"
        className="w-full mt-2 px-3 py-2 rounded"
        style={inputStyle}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onSubmit(score, order, note)}
          className="flex-1 py-3 rounded"
          style={{
            background: C.char,
            color: C.mustard,
            fontFamily: F_DISPLAY,
            fontSize: 20,
            letterSpacing: '0.04em',
            boxShadow: COMIC_SHADOW,
          }}
        >
          POST SCORE
        </button>
        <button
          onClick={onCancel}
          className="px-4 rounded"
          style={{ border: `2px solid ${C.char}`, color: C.char }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
