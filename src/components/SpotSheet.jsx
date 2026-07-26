import { useState } from 'react'
import { C, F_DISPLAY, F_MONO, COMIC_SHADOW, scoreColor, tierLabel, avgScore, topOrder, isHot } from '../theme.js'
import { Gauge } from './Gauge.jsx'
import { Sheet } from './Sheet.jsx'
import { ScoreForm } from './ScoreForm.jsx'

const domain = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

export function SpotSheet({ spot, scoring, onScoreStart, onScoreCancel, onSubmit, onAddLink, onClose }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const avg = avgScore(spot)
  const best = topOrder(spot)
  return (
    <Sheet title={spot.area.toUpperCase()} onClose={onClose}>
      <div className="flex items-start gap-4">
        <Gauge score={avg} size={72} />
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: F_DISPLAY, fontSize: 26, color: C.char, lineHeight: 1.05 }}>
            {spot.name}
          </div>
          <div style={{ fontFamily: F_DISPLAY, fontSize: 17, color: scoreColor(avg), marginTop: 2 }}>
            {avg == null ? '' : `${avg.toFixed(1)} — `}
            {tierLabel(avg)}
          </div>
          <div style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.65, marginTop: 3 }}>
            {spot.ratings.length
              ? `${spot.ratings.length} ${spot.ratings.length === 1 ? 'SCORE' : 'SCORES'}`
              : `RECOMMENDED BY ${spot.by.toUpperCase()}`}
          </div>
        </div>
      </div>

      {spot.pitch && !spot.ratings.length && (
        <div style={{ fontSize: 14, color: C.char, marginTop: 10 }}>“{spot.pitch}”</div>
      )}

      {best && (
        <div className="mt-4 p-3 rounded" style={{ background: C.mustard }}>
          <div style={{ fontFamily: F_MONO, fontSize: 10, color: C.char, opacity: 0.7 }}>
            WHAT TO GET
          </div>
          <div style={{ fontFamily: F_DISPLAY, fontSize: 20, color: C.char, lineHeight: 1.1 }}>
            {best.label}
          </div>
          <div style={{ fontFamily: F_MONO, fontSize: 10, color: C.char, opacity: 0.7 }}>
            {best.n} {best.n === 1 ? 'PERSON' : 'PEOPLE'} ORDERED IT
          </div>
        </div>
      )}

      {/* HYPE: articles + videos people attach to this spot */}
      <div className="mt-4 p-3 rounded" style={{ border: `2px solid ${C.paperDeep}` }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.ink, opacity: 0.7 }}>
            {isHot(spot) ? '🔥 ' : ''}HYPE{spot.links?.length ? ` · ${spot.links.length} ${spot.links.length === 1 ? 'LINK' : 'LINKS'}` : ''}
          </span>
          <button
            onClick={() => setLinkOpen(!linkOpen)}
            style={{ fontFamily: F_MONO, fontSize: 10, color: C.ketchup }}
          >
            {linkOpen ? 'CANCEL' : '+ ADD A LINK'}
          </button>
        </div>
        {linkOpen && (
          <div className="mt-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Paste a TikTok, article, or video URL"
              className="w-full px-2 py-2 rounded mb-1"
              style={{ border: `2px solid ${C.char}`, background: C.paper, color: C.char, fontSize: 13 }}
            />
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="What is it? (optional)"
              className="w-full px-2 py-2 rounded mb-1"
              style={{ border: `2px solid ${C.char}`, background: C.paper, color: C.char, fontSize: 13 }}
            />
            <button
              disabled={!/^https?:\/\/\S+\.\S+/.test(linkUrl.trim())}
              onClick={() => {
                onAddLink(spot.id, linkUrl.trim(), linkTitle.trim())
                setLinkOpen(false)
                setLinkUrl('')
                setLinkTitle('')
              }}
              className="w-full py-2 rounded"
              style={{
                background: /^https?:\/\/\S+\.\S+/.test(linkUrl.trim()) ? C.char : C.paperDeep,
                color: /^https?:\/\/\S+\.\S+/.test(linkUrl.trim()) ? C.mustard : C.ink,
                fontFamily: F_DISPLAY,
                fontSize: 15,
              }}
            >
              POST THE HYPE
            </button>
          </div>
        )}
        {(spot.links || []).slice(0, 6).map((l, i) => (
          <a
            key={i}
            href={l.url}
            target="_blank"
            rel="noreferrer nofollow"
            className="block mt-2"
            style={{ textDecoration: 'none' }}
          >
            <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.pickle }}>
              {domain(l.url).toUpperCase()}
            </span>
            <span className="block" style={{ fontSize: 13, color: C.char, textDecoration: 'underline' }}>
              {l.title || l.url.slice(0, 60)}
            </span>
          </a>
        ))}
      </div>

      <a
        href={`https://maps.apple.com/?ll=${spot.lat},${spot.lng}&q=${encodeURIComponent(spot.name)}`}
        target="_blank"
        rel="noreferrer"
        className="block mt-3"
        style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, textDecoration: 'underline', opacity: 0.7 }}
      >
        DIRECTIONS →
      </a>

      {scoring ? (
        <ScoreForm onSubmit={(s, o, n) => onSubmit(spot.id, s, o, n)} onCancel={onScoreCancel} />
      ) : (
        <button
          onClick={onScoreStart}
          className="w-full mt-4 py-3 rounded"
          style={{
            background: C.ketchup,
            color: C.paper,
            fontFamily: F_DISPLAY,
            fontSize: 21,
            letterSpacing: '0.04em',
            border: `3px solid ${C.char}`,
            boxShadow: COMIC_SHADOW,
          }}
        >
          SCORE THIS BURGER
        </button>
      )}

      <div className="mt-5">
        {spot.ratings.slice(0, 15).map((r, i) => (
          <div key={i} className="flex gap-3 py-2" style={{ borderTop: `1px solid ${C.paperDeep}` }}>
            <span style={{ fontFamily: F_DISPLAY, fontSize: 18, color: scoreColor(r.score), width: 34 }}>
              {r.score.toFixed(1)}
            </span>
            <span className="flex-1 min-w-0">
              <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.ink, opacity: 0.6 }}>
                {r.by.toUpperCase()}
                {r.order ? ` · ${r.order.toUpperCase()}` : ''}
              </span>
              {r.note && (
                <span className="block" style={{ fontSize: 13, color: C.char, marginTop: 2 }}>
                  {r.note}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
