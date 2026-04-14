'use client'
import { useState, useEffect, useRef } from 'react'

const holes = [
  { hole: 1, par: '4/5', hcp: 2,  blue: 430, white: 414, red: 388, vimeoId: '929585072' },
  { hole: 2, par: 3,     hcp: 3,  blue: 196, white: 162, red: 141, vimeoId: '929585190' },
  { hole: 3, par: 4,     hcp: 6,  blue: 358, white: 337, red: 270, vimeoId: '929585243' },
  { hole: 4, par: 5,     hcp: 5,  blue: 460, white: 444, red: 401, vimeoId: '929585276' },
  { hole: 5, par: 3,     hcp: 9,  blue: 154, white: 142, red: 120, vimeoId: '929585376' },
  { hole: 6, par: 4,     hcp: 8,  blue: 354, white: 333, red: 309, vimeoId: '929585426' },
  { hole: 7, par: 4,     hcp: 7,  blue: 323, white: 315, red: 307, vimeoId: '929585463' },
  { hole: 8, par: '4/5', hcp: 1,  blue: 455, white: 437, red: 416, vimeoId: '929585498' },
  { hole: 9, par: 5,     hcp: 4,  blue: 505, white: 495, red: 400, vimeoId: '929585538' },
]

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export default function HoleFlyover() {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hasNavigated = useRef(false)

  function goTo(i: number) {
    if (i === active) return
    hasNavigated.current = true
    clearTimeout(timer.current)
    setFading(true)
    timer.current = setTimeout(() => {
      setActive(i)
      setFading(false)
    }, 220)
  }

  // Keyboard navigation — functional update avoids stale closure
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setActive(a => (a - 1 + 9) % 9)
      if (e.key === 'ArrowRight') setActive(a => (a + 1) % 9)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const hole = holes[active]
  // Hole 1 paused on initial page load only; autoplay when navigating back to it
  const autoplay = active !== 0 || hasNavigated.current
  const src = `https://player.vimeo.com/video/${hole.vimeoId}?title=0&byline=0&portrait=0&color=c9a84c${autoplay ? '&autoplay=1&muted=1' : ''}`

  return (
    <section className="bg-swan-dark py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-swan-gold mb-1">Hole Flyover</h2>
          <p className="text-gray-500 text-sm tracking-wide">Drone footage &middot; All 9 holes</p>
        </div>

        {/* Hole tabs + prev/next row */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => goTo((active - 1 + 9) % 9)}
            aria-label="Previous hole"
            className="flex-shrink-0 w-9 h-9 rounded-full border border-white/20 text-gray-400 flex items-center justify-center hover:border-swan-gold hover:text-swan-gold transition-all duration-200"
          >
            <ChevronLeft />
          </button>

          <div className="flex gap-1 flex-1 justify-center overflow-x-auto no-scrollbar">
            {holes.map((h, i) => (
              <button
                key={h.hole}
                onClick={() => goTo(i)}
                aria-label={`Hole ${h.hole}`}
                className={`flex-shrink-0 w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 ${
                  i === active
                    ? 'bg-swan-gold text-swan-dark shadow-lg scale-110'
                    : 'border border-white/20 text-gray-400 hover:border-swan-gold/70 hover:text-swan-gold'
                }`}
              >
                {h.hole}
              </button>
            ))}
          </div>

          <button
            onClick={() => goTo((active + 1) % 9)}
            aria-label="Next hole"
            className="flex-shrink-0 w-9 h-9 rounded-full border border-white/20 text-gray-400 flex items-center justify-center hover:border-swan-gold hover:text-swan-gold transition-all duration-200"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Video + overlaid arrows */}
        <div className="relative">
          <button
            onClick={() => goTo((active - 1 + 9) % 9)}
            aria-label="Previous hole"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-swan-dark hover:bg-swan-gold hover:border-swan-gold transition-all duration-200"
          >
            <ChevronLeft />
          </button>

          <div
            className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
            style={{ opacity: fading ? 0 : 1, transition: 'opacity 220ms ease-in-out' }}
          >
            <iframe
              key={active}
              src={src}
              title={`Hole ${hole.hole} flyover`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <button
            onClick={() => goTo((active + 1) % 9)}
            aria-label="Next hole"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-swan-dark hover:bg-swan-gold hover:border-swan-gold transition-all duration-200"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Hole info */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 px-1">
          <div className="flex items-baseline gap-2.5">
            <span className="text-swan-gold font-bold text-2xl">Hole {hole.hole}</span>
            <span className="text-gray-400 text-sm">Par {hole.par}</span>
            <span className="text-gray-700">&middot;</span>
            <span className="text-gray-400 text-sm">Handicap {hole.hcp}</span>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Blue</div>
              <div className="text-white font-bold text-lg leading-none">{hole.blue}</div>
              <div className="text-gray-600 text-xs mt-0.5">yds</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1">White</div>
              <div className="text-white font-bold text-lg leading-none">{hole.white}</div>
              <div className="text-gray-600 text-xs mt-0.5">yds</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-1">Red</div>
              <div className="text-white font-bold text-lg leading-none">{hole.red}</div>
              <div className="text-gray-600 text-xs mt-0.5">yds</div>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-8">
          {holes.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to hole ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === active
                  ? 'w-7 h-2 bg-swan-gold'
                  : 'w-2 h-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <p className="text-center text-gray-700 text-xs mt-4 select-none">
          Use ← → arrow keys to navigate
        </p>

      </div>
    </section>
  )
}
