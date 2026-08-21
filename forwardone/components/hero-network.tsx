import { Plane, Ship, Truck } from 'lucide-react'

// Premium abstract logistics-network visual (pure SVG/CSS — no stock photography).
export function HeroNetwork() {
  const nodes = [
    { cx: 70, cy: 90 }, { cx: 210, cy: 55 }, { cx: 350, cy: 110 },
    { cx: 120, cy: 210 }, { cx: 290, cy: 200 }, { cx: 400, cy: 250 },
    { cx: 60, cy: 300 }, { cx: 230, cy: 320 },
  ]
  const routes = [
    'M70 90 C 150 40, 200 60, 210 55',
    'M210 55 C 300 70, 330 90, 350 110',
    'M70 90 C 90 160, 100 180, 120 210',
    'M120 210 C 220 180, 260 190, 290 200',
    'M290 200 C 360 210, 380 230, 400 250',
    'M120 210 C 130 270, 170 300, 230 320',
    'M210 55 C 250 130, 270 170, 290 200',
  ]
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 backdrop-blur">
        <svg viewBox="0 0 460 380" className="h-auto w-full" role="img" aria-label="Global logistics network with connected shipping routes">
          <defs>
            <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#60A5FA" />
              <stop offset="1" stopColor="#2563EB" />
            </linearGradient>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#93C5FD" />
              <stop offset="1" stopColor="#2563EB" />
            </radialGradient>
          </defs>
          {routes.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="url(#routeGrad)" strokeWidth="1.6" strokeOpacity="0.55" className="route-line" style={{ animationDelay: `${i * -2}s` }} />
          ))}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.cx} cy={n.cy} r="9" fill="#2563EB" opacity="0.18" />
              <circle cx={n.cx} cy={n.cy} r="4" fill="url(#nodeGlow)" />
            </g>
          ))}
        </svg>
        <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#070E1C]/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><Plane className="h-4 w-4 text-[#60A5FA]" /> Air</div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#070E1C]/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><Truck className="h-4 w-4 text-[#60A5FA]" /> Road</div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#070E1C]/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur"><Ship className="h-4 w-4 text-[#60A5FA]" /> Sea</div>
        </div>
      </div>
    </div>
  )
}
