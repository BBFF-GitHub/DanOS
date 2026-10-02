import { UK_MAP_PATHS, UK_W, UK_H, UK_BOUNDS } from './ukMapData.js'

const GROUND_COORDS = {
  1:  [51.555,-0.108],  2:  [52.509,-1.885],  3:  [50.735,-1.838],
  4:  [51.491,-0.289],  5:  [50.862,-0.083],  6:  [51.482,-0.191],
  7:  [51.398,-0.085],  8:  [53.438,-2.966],  9:  [51.475,-0.221],
  10: [52.055, 1.145],  11: [52.620,-1.142],  12: [53.431,-2.961],
  13: [53.483,-2.200],  14: [53.463,-2.291],  15: [54.975,-1.622],
  16: [52.940,-1.133],  17: [50.906,-1.391],  18: [51.604,-0.066],
  19: [51.538,-0.016],  20: [52.590,-2.130],  21: [53.730,-2.489],
  22: [51.440,-2.620],  23: [53.789,-2.230],  24: [51.473,-3.203],
  25: [52.448,-1.499],  26: [52.915,-1.447],  27: [53.746,-0.368],
  28: [53.777,-1.572],  29: [51.883,-0.432],  30: [54.578,-1.217],
  31: [51.486,-0.051],  32: [52.622, 1.309],  33: [51.716,-1.209],
  34: [50.388,-4.122],  35: [50.796,-1.064],  36: [53.777,-2.681],
  37: [51.523,-0.232],  38: [53.370,-1.471],  39: [53.000,-2.175],
  40: [54.914,-1.388],  41: [51.643,-3.935],  42: [51.650,-0.402],
  43: [52.509,-2.064],  44: [53.411,-1.500],  45: [52.477,-1.869],
  46: [53.552,-1.479],  47: [53.804,-3.048],  48: [53.581,-2.536],
  49: [51.463,-2.576],  50: [52.823,-1.636],  51: [52.205, 0.118],
  52: [51.487, 0.036],  53: [50.726,-3.529],  54: [53.655,-1.768],
  55: [53.228,-0.540],  56: [52.013,-0.734],  57: [52.240,-0.939],
  58: [52.569,-0.237],  59: [51.455,-0.972],  60: [53.430,-1.363],
  61: [52.707,-2.750],  62: [51.902,-0.207],  63: [53.550,-2.665],
  64: [53.047,-2.992],  65: [53.406,-2.157],  66: [51.630,-0.799],
  67: [51.560,-0.013],  68: [51.107,-0.189],  69: [51.413,-0.196],
  70: [53.757,-2.361],  71: [53.800,-1.760],  72: [51.370, 0.013],
  73: [54.896,-2.940],  74: [51.899,-2.063],  75: [53.235,-1.424],
  76: [51.892, 0.898],  77: [53.089,-2.441],  78: [53.520,-1.122],
  79: [53.918,-2.891],  80: [51.384, 0.547],  81: [53.567,-0.073],
  82: [53.998,-1.528],  83: [54.065,-2.864],  84: [51.588,-2.996],
  85: [52.948,-1.149],  86: [53.044,-2.182],  87: [53.511,-2.281],
  88: [51.564,-1.782],  89: [53.374,-3.010],  90: [52.565,-1.984],
  91: [50.735,-1.838],  92: [51.588,-2.996],
}

const LEAGUE_COLORS = {
  'Premier League': '#4f6ef7',
  'Championship':   '#f59e0b',
  'League One':     '#22c55e',
  'League Two':     '#ef4444',
}

function project(lat, lng) {
  const x = ((lng - UK_BOUNDS.lngMin) / (UK_BOUNDS.lngMax - UK_BOUNDS.lngMin)) * UK_W
  const y = UK_H - ((lat - UK_BOUNDS.latMin) / (UK_BOUNDS.latMax - UK_BOUNDS.latMin)) * UK_H
  return [x, y]
}

export default function UKGroundsMap({ clubs92, visited }) {
  const visitedObj = visited || {}
  const visitedCount = Object.values(visitedObj).filter(Boolean).length

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${UK_W} ${UK_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* UK regions */}
        {UK_MAP_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="var(--bg-badge)"
            stroke="var(--bg-app)"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        ))}

        {/* Unvisited grounds first (so visited render on top) */}
        {clubs92.filter(c => !visitedObj[c.id]).map(club => {
          const coords = GROUND_COORDS[club.id]
          if (!coords) return null
          const [x, y] = project(coords[0], coords[1])
          return (
            <circle key={club.id} cx={x} cy={y} r={2} fill="var(--border)" opacity={0.5}>
              <title>{club.name}</title>
            </circle>
          )
        })}

        {/* Visited grounds on top */}
        {clubs92.filter(c => !!visitedObj[c.id]).map(club => {
          const coords = GROUND_COORDS[club.id]
          if (!coords) return null
          const [x, y] = project(coords[0], coords[1])
          const color = LEAGUE_COLORS[club.league] || '#4f6ef7'
          return (
            <g key={club.id}>
              <circle cx={x} cy={y} r={5} fill={color} opacity={0.2} />
              <circle cx={x} cy={y} r={3} fill={color}>
                <title>{club.name} ✓</title>
              </circle>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
        {Object.entries(LEAGUE_COLORS).map(([league, color]) => {
          const leagueClubs = clubs92.filter(c => c.league === league)
          const leagueVisited = leagueClubs.filter(c => visitedObj[c.id]).length
          return (
            <div key={league} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {league.replace('Premier League', 'PL').replace('Championship', 'Champ')} {leagueVisited}/{leagueClubs.length}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
