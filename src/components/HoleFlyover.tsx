'use client'
import { useState, useEffect, useRef } from 'react'

const holes = [
  { hole: 1, par: '4/5', hcp: 2, blue: 430, white: 414, red: 388, vimeoId: '929585072', description: "The starting hole requires an accurate drive, as OB borders the left hand side. The rough on either side of the fairway are scattered with many trees. A par on the opening hole is always a great score to start your round." },
  { hole: 2, par: 3,     hcp: 3, blue: 196, white: 162, red: 141, vimeoId: '929585190', description: "This par 3 can be deceiving off the tee. Choose your club wisely to carry onto the green. Short has a chance of rolling onto the green. Long and left is unwise." },
  { hole: 3, par: 4,     hcp: 6, blue: 358, white: 337, red: 270, vimeoId: '929585243', description: "A picturesque tee shot from the White and Blue tees. Playing your drive slightly over the large grouping of trees on the right will give you the best look into the green for your second shot." },
  { hole: 4, par: 5,     hcp: 5, blue: 460, white: 444, red: 401, vimeoId: '929585276', description: "A true risk/reward par 5. Depending on your distance off the tee can leave you with a look at going for the green in two. Laying up into the fairway past the creek is a sensible shot." },
  { hole: 5, par: 3,     hcp: 9, blue: 154, white: 142, red: 120, vimeoId: '929585376', description: "Don't let the holes handicap fool you. This downhill par 3 with a demanding back to front sloping green will often leave you scratching your head as to whether you picked the correct club." },
  { hole: 6, par: 4,     hcp: 8, blue: 354, white: 333, red: 309, vimeoId: '929585426', description: "Straight away par 4. Grip it and rip it down the fairway. Try to get on the green in two, two putt at most, and grab a cold one and a hot dog at the 'Sugar Shack'." },
  { hole: 7, par: 4,     hcp: 7, blue: 323, white: 315, red: 307, vimeoId: '929585463', description: "Watch out for the tree in the fairway on the left and the tree just in the rough on the right. With the trees, large breaks on the green, and pressure from the gallery at the clubhouse - this hole can be trickier than it looks." },
  { hole: 8, par: '4/5', hcp: 1, blue: 455, white: 437, red: 416, vimeoId: '929585498', description: "A monster of a par 4 (Blues/Whites), this hole doglegs to the the right with OB threatening you behind the green. The more accurate your drive is off the tee the better of a chance you have with getting out of this hole with a par or better." },
  { hole: 9, par: 5,     hcp: 4, blue: 505, white: 495, red: 400, vimeoId: '929585538', description: "Avoid going too far left off the tee, as OB lines the road to the left. Don't forget to ring the bell on the right hand side of the hole as you pass and enjoy the tall Norway pines behind the green. How about another 9?" },
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
  // navCount increments on every goTo() call — used to key iframes so
  // each navigation creates a fresh iframe, and to track "has navigated"
  const [navCount, setNavCount] = useState(0)
  // Tracks whether the user dismissed the hole-1 play overlay manually
  const [hole1OverlayVisible, setHole1OverlayVisible] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // After any navigation, all holes autoplay (including hole 1 on return visits)
  const autoplay = navCount > 0 || active !== 0
  // Show play overlay only on the very first hole-1 view, before user interacts
  const showPlayOverlay = active === 0 && navCount === 0 && hole1OverlayVisible
  // Unique key per navigation so each hole visit gets a fresh iframe
  const iframeKey = `${active}-${navCount}`
  const src = `https://player.vimeo.com/video/${holes[active].vimeoId}?title=0&byline=0&portrait=0&color=c9a84c${autoplay ? '&autoplay=1&muted=1' : ''}`

  function goTo(i: number) {
    if (i === active) return
    setNavCount(n => n + 1)
    clearTimeout(timer.current)
    setFading(true)
    timer.current = setTimeout(() => {
      setActive(i)
      setFading(false)
    }, 220)
  }

  // Play hole 1 without reloading the iframe — send postMessage play command
  function playHole1() {
    setHole1OverlayVisible(false)
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: 'play' }),
      'https://player.vimeo.com'
    )
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setActive(a => (a - 1 + 9) % 9)
      if (e.key === 'ArrowRight') setActive(a => (a + 1) % 9)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-advance when a video finishes via Vimeo postMessage API
  useEffect(() => {
    // Register for the finish event once the player is ready
    function register() {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ method: 'addEventListener', value: 'finish' }),
        'https://player.vimeo.com'
      )
    }
    // Attempt after a short delay in case the player is already loaded
    const t = setTimeout(register, 1500)

    function handleMessage(e: MessageEvent) {
      if (typeof e.data !== 'string' || !e.origin.includes('vimeo')) return
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'ready') register()
        if (data.event === 'finish') goTo((active + 1) % 9)
      } catch { /* non-JSON message, ignore */ }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(t)
      window.removeEventListener('message', handleMessage)
    }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const hole = holes[active]

  return (
    <section className="bg-swan-dark py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-swan-gold mb-1">Hole-By-Hole</h2>
          <p className="text-gray-500 text-sm tracking-wide">Drone footage &middot; All 9 holes</p>
        </div>

        {/* Hole tabs */}
        <div className="flex justify-center py-4 mb-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-2">
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
            {/* Hole 1 play overlay — shown only before the user has interacted */}
            {showPlayOverlay && (
              <div
                role="button"
                aria-label="Play Hole 1 flyover"
                onClick={playHole1}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 cursor-pointer bg-black/40"
              >
                <div className="w-20 h-20 rounded-full bg-swan-gold flex items-center justify-center shadow-2xl hover:bg-swan-gold-light transition-colors duration-200">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-swan-dark ml-1">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-white text-sm font-semibold tracking-widest uppercase drop-shadow-lg">
                  Watch Flyover
                </span>
              </div>
            )}

            <iframe
              ref={iframeRef}
              key={iframeKey}
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

        {/* Hole description */}
        <p className="mt-4 text-gray-400 text-sm leading-relaxed px-1">{hole.description}</p>


      </div>
    </section>
  )
}
