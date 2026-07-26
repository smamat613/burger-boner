import { C, F_DISPLAY, F_MONO, scoreColor, tierLabel, avgScore, topOrder } from '../theme.js'
import { Gauge } from './Gauge.jsx'
import { Sheet } from './Sheet.jsx'
import { ScoreForm } from './ScoreForm.jsx'

export function SpotSheet({ spot, scoring, onScoreStart, onScoreCancel, onSubmit, onClose }) {
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
            fontSize: 20,
            letterSpacing: '0.03em',
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
