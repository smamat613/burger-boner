import { C, scoreColor } from '../theme.js'

// The needle dial: flat on the floor (1) to straight up (10)
export function Gauge({ score, size = 64 }) {
  const color = scoreColor(score)
  const rot = score == null ? 128 : 180 - score * 18
  const c = size / 2
  const r = size * 0.42
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <path
        d={`M ${c} ${c + r} A ${r} ${r} 0 0 1 ${c} ${c - r}`}
        fill="none"
        stroke={C.paperDeep}
        strokeWidth={size * 0.045}
        strokeLinecap="round"
      />
      <line
        x1={c - r * 0.55}
        y1={c}
        x2={c + r * 0.2}
        y2={c}
        stroke={C.ink}
        opacity={0.3}
        strokeWidth={size * 0.03}
      />
      <g transform={`rotate(${rot} ${c} ${c})`}>
        <line
          x1={c}
          y1={c}
          x2={c}
          y2={c - r}
          stroke={color}
          strokeWidth={size * 0.13}
          strokeLinecap="round"
          strokeDasharray={score == null ? `${size * 0.09} ${size * 0.07}` : undefined}
        />
      </g>
      <circle cx={c} cy={c} r={size * 0.07} fill={color} />
    </svg>
  )
}

// The playful "meter" illustration used on the loading screen, score form and scale sheet
export function Meter({ score, size = 100 }) {
  const color = scoreColor(score)
  const s = score ?? 5
  const lift = (1 - s / 10) * 58
  const sag = (1 - s / 10) * 7
  const px = 54
  const py = 68 + sag
  const floorY = 66
  const slab = `M 4 ${floorY} L ${px - 26} ${floorY} Q ${px} ${floorY + sag * 2.4} ${px + 26} ${floorY} L 92 ${floorY} L 92 86 L 4 86 Z`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" aria-hidden="true">
      <rect x={4} y={38} width={26} height={48} rx={5} fill={C.ink} opacity={0.16} />
      <path d={slab} fill={C.ink} opacity={0.24} />
      <rect x={80} y={52} width={14} height={34} rx={5} fill={C.ink} opacity={0.16} />
      <polyline
        points={`${px},${py} 74,${py + 6} 88,58`}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <g transform={`rotate(${-lift} ${px} ${py})`}>
        <line x1={px} y1={py} x2={px} y2={py - 28} stroke={color} strokeWidth={11} strokeLinecap="round" />
        <circle cx={px} cy={py - 38} r={9} fill={color} />
      </g>
    </svg>
  )
}
