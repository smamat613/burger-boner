// Brand + design tokens. Rename the app in ONE place if the brand ever changes.
export const APP_NAME = 'BURGER BONER'
export const APP_TAG = '/10'

export const C = {
  paper: '#F2E9D8',
  paperDeep: '#E6D9C0',
  char: '#221E1B',
  ketchup: '#C8372D',
  mustard: '#E8B430',
  pickle: '#4A7C3F',
  ink: '#3A342E',
  water: '#CFE0DA',
}

export const F_DISPLAY = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
export const F_BODY = "'Helvetica Neue', Helvetica, Arial, sans-serif"
export const F_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export const scoreColor = (s) =>
  s == null ? C.ink : s >= 7.5 ? C.pickle : s >= 5 ? C.mustard : C.ketchup

export const TIERS = [
  [2, 'FLACCID'],
  [4, 'BARELY STIRRING'],
  [6, 'HALF MAST'],
  [7.5, 'FIRM'],
  [9, 'FULL MAST'],
  [10.1, 'ROCK HARD'],
]

export const tierLabel = (s) =>
  s == null ? 'UNSCORED' : TIERS.find(([max]) => s < max)[1]

export const avgScore = (spot) =>
  spot.ratings.length
    ? spot.ratings.reduce((a, r) => a + r.score, 0) / spot.ratings.length
    : null

// Most-ordered item at a spot
export const topOrder = (spot) => {
  const tally = {}
  spot.ratings.forEach((r) => {
    const k = (r.order || '').trim().toLowerCase()
    if (k) {
      tally[k] = tally[k] || { label: r.order.trim(), n: 0 }
      tally[k].n++
    }
  })
  const best = Object.values(tally).sort((a, b) => b.n - a.n)[0]
  return best && best.n > 0 ? best : null
}
