import { C, F_DISPLAY, F_MONO } from '../theme.js'
import { EmptyState } from './Sheet.jsx'
import { IconRecs } from './icons.jsx'

export function RecsList({ spots, me, onCosign, onScore }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <p style={{ fontFamily: F_MONO, fontSize: 11, color: C.ink, opacity: 0.65, marginBottom: 12 }}>
        PLACES ON THE LIST, NOBODY'S SCORED. COSIGN TO PUSH ONE UP.
      </p>
      {spots.length === 0 && <EmptyState line="Nothing on the list. Hit + and put somebody on." />}
      {spots.map((s) => {
        const mine = s.cosigns.includes(me)
        return (
          <div key={s.id} className="py-3" style={{ borderBottom: `1px solid ${C.paperDeep}` }}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => onCosign(s.id)}
                className="flex flex-col items-center justify-center rounded shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  border: `2px solid ${mine ? C.ketchup : C.char}`,
                  background: mine ? C.ketchup : 'transparent',
                  color: mine ? C.paper : C.char,
                }}
                aria-label="Cosign this recommendation"
              >
                <IconRecs size={15} />
                <span style={{ fontFamily: F_DISPLAY, fontSize: 14, lineHeight: 1 }}>
                  {s.cosigns.length}
                </span>
              </button>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: F_DISPLAY, fontSize: 19, color: C.char }}>{s.name}</div>
                <div style={{ fontFamily: F_MONO, fontSize: 10, color: C.ink, opacity: 0.6 }}>
                  {s.area.toUpperCase()} · FROM {s.by.toUpperCase()}
                </div>
                {s.pitch && (
                  <div style={{ fontSize: 13, color: C.char, marginTop: 4 }}>“{s.pitch}”</div>
                )}
              </div>
            </div>
            <button
              onClick={() => onScore(s)}
              className="w-full mt-2 py-2 rounded"
              style={{ border: `2px solid ${C.char}`, color: C.char, fontFamily: F_DISPLAY, fontSize: 15 }}
            >
              BEEN THERE — SCORE IT
            </button>
          </div>
        )
      })}
    </div>
  )
}
