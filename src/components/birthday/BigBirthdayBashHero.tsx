// Full-bleed photo hero for The Big Birthday Bash.
//
// Hero image is editor-managed: pulled from the 'birthday-bash' row in
// the verticals table (same pattern as FRG / Mom Knows Best). Editor
// uploads via /admin/verticals/birthday-bash/edit. Falls back to a
// gradient when no image is set so the hero is never blank.

import Image from 'next/image'

interface Props {
  totalListings:   number
  totalCategories: number
  heroImageUrl?:   string | null
  title?:          string | null
  subtitle?:       string | null
}

export function BigBirthdayBashHero({ totalListings, totalCategories, heroImageUrl, title, subtitle }: Props) {
  const displayTitle    = title    ?? 'The Big Birthday Bash'
  const displaySubtitle = subtitle ?? 'Every venue, vendor, theme and tip for planning your kid\'s birthday in the River Region. Local moms have tested every one.'
  // Split the last word out so we can highlight it (e.g. "Bash")
  const titleParts = displayTitle.match(/^(.*)\s+(\S+)$/)
  const titleHead  = titleParts ? titleParts[1] : displayTitle
  const titleTail  = titleParts ? titleParts[2] : ''
  return (
    <div className="relative overflow-hidden border-b border-black/5">
      <div className="absolute inset-0">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={displayTitle}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          // Brand-gradient fallback — no broken image, ever
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff7a59] via-[#ff9d8a] to-[#ffd9cc]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 text-white">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
            🎂 The Ultimate Planning Portal
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight">
            {titleHead}{titleTail && <> <span className="text-[#ff7a59]">{titleTail}</span></>}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mt-4 max-w-2xl mx-auto leading-relaxed">
            {displaySubtitle}
          </p>

          <div className="mt-7 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-sm">
            <Stat n={totalListings} label="vetted vendors" />
            <span className="opacity-30">•</span>
            <Stat n={totalCategories} label="categories" />
            <span className="opacity-30">•</span>
            <Stat label="real River Region" subline="parties shared" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ n, label, subline }: { n?: number; label: string; subline?: string }) {
  return (
    <div className="text-center">
      {n !== undefined && <div className="text-2xl sm:text-3xl font-black text-white">{n}</div>}
      <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/80">{label}</div>
      {subline && <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/80">{subline}</div>}
    </div>
  )
}
