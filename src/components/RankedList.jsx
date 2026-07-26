import { C, F_DISPLAY, F_MONO, avgScore, tierLabel, topOrder } from '../theme.js'
import { Gauge } from './Gauge.jsx'
import { EmptyState } from './Sheet.jsx'

export function RankedList({ spots, onPick }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      {spots.length === 0 && <EmptyState line="No scores yet. Somebody has to go first." />}
      {spots.map((s, i) => {
        const best = topOrder(s)
        const avg = avgScore(s)
        return (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            className="w-full flex items-center gap-3 py-3 text-left"
            style={{ borderBottom: `1px solid ${C.paperDeep}` }}
          >
            <span style={{ fontFamily: F_MONO, fontSize: 12, color: C.ink, opacity: 0.5, width: 22 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <Gauge score={avg} size={46} />
            <span className="flex-1 min-w-0">
              <span
                className="block truncate"
                style={{ fontFamily: F_DISPLAY, fontSize: 19, color: C.char }}
              >
                {s.name}
              </span>
              <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.ink, opacity: 0.6 }}>
                {avg.toFixed(1)} {tierLabel(avg)} · {s.area.toUpperCase()}
                {best ? ` · GET THE ${best.label.toUpperCase()}` : ''}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
