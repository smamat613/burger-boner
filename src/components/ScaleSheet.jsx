import { C, F_DISPLAY, F_MONO, TIERS, scoreColor } from '../theme.js'
import { Meter } from './Gauge.jsx'
import { Sheet } from './Sheet.jsx'

export function ScaleSheet({ onClose }) {
  return (
    <Sheet title="THE SCALE" onClose={onClose}>
      <p style={{ fontSize: 14, color: C.char, marginBottom: 14 }}>
        One needle, 180 degrees. Flat on the floor is a burger you regret. Straight up is the best
        thing you'll eat this year. Everything else is somewhere in between.
      </p>
      <div className="flex flex-wrap justify-between gap-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <div key={n} className="flex flex-col items-center" style={{ width: '19%' }}>
            <Meter score={n} size={58} />
            <span style={{ fontFamily: F_DISPLAY, fontSize: 17, color: scoreColor(n), lineHeight: 1 }}>
              {n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5">
        {TIERS.map(([max, label], i) => {
          const lo = i === 0 ? 0 : TIERS[i - 1][0]
          const hi = Math.min(max - 0.1, 10)
          return (
            <div
              key={label}
              className="flex items-center gap-3 py-2"
              style={{ borderTop: `1px solid ${C.paperDeep}` }}
            >
              <span className="shrink-0" style={{ width: 26, height: 12, background: scoreColor(hi) }} />
              <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.7, width: 62 }}>
                {lo.toFixed(1)}–{hi.toFixed(1)}
              </span>
              <span style={{ fontFamily: F_DISPLAY, fontSize: 18, color: C.char }}>{label}</span>
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
