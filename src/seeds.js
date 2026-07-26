// The original Metro Detroit starter list. Used to seed the shared database
// (or local storage when the API isn't configured yet).
export const SEED_SPOTS = [
  { id: 's1', name: 'Green Dot Stables', area: 'Corktown', lat: 42.3285, lng: -83.067 },
  { id: 's2', name: 'Mercury Burger Bar', area: 'Michigan Ave', lat: 42.33, lng: -83.07 },
  { id: 's3', name: 'Grey Ghost', area: 'Brush Park', lat: 42.3465, lng: -83.057 },
  { id: 's4', name: 'Redcoat Tavern', area: 'Royal Oak', lat: 42.509, lng: -83.149 },
  { id: 's5', name: "Miller's Bar", area: 'Dearborn', lat: 42.306, lng: -83.227 },
  { id: 's6', name: 'Telway', area: 'West Michigan Ave', lat: 42.333, lng: -83.115 },
].map((s) => ({ ...s, ratings: [], cosigns: [], pitch: '', by: 'House' }))

export const DETROIT = { lat: 42.3314, lng: -83.0458 }
