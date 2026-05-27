// CategoryGraphic — branded SVG fallback for events with no hero image.
//
// We previously rendered a per-category variant (📚 Library, 🎶 Music, etc.)
// based on either the stored category or a title-based classifier. In
// practice the classifier guessed wrong on ~20% of events, and a wrong
// graphic on the public calendar reads worse than no specific graphic at
// all (signals "we don't know what we're doing").
//
// Current design: one branded "Community Event" card used for every
// imageless event. Variety comes from real organizer images once they're
// uploaded; the category chip on the card body still tells you what kind
// of event it is. Less surface area to get wrong.

import { Calendar } from 'lucide-react'

interface Props {
  // Kept on the props signature for API stability (call sites pass them)
  // but unused — every imageless event renders the same neutral card now.
  category?: string | null
  title?:    string | null
  className?: string
}

export function CategoryGraphic({ className = '' }: Props) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ backgroundColor: '#fdf0eb' /* fg-terra-light */ }}
      aria-hidden="true"
    >
      {/* Subtle radial — adds depth without competing with the wordmark */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, #ef64421a 0%, transparent 60%)',
        }}
      />
      {/* Decorative coral dots in the corners — picks up the brand pattern
          used on the magazine masthead */}
      <span
        className="absolute top-3 left-3 inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: '#ef644240' }}
      />
      <span
        className="absolute top-3 right-3 inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: '#ef644240' }}
      />
      <span
        className="absolute bottom-3 left-3 inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: '#ef644240' }}
      />
      <span
        className="absolute bottom-3 right-3 inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: '#ef644240' }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <div
          className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-2"
          style={{ backgroundColor: '#ef64421f' }}
        >
          <Calendar
            className="w-7 h-7 md:w-8 md:h-8"
            strokeWidth={1.8}
            style={{ color: '#a8421d' }}
          />
        </div>
        <span
          className="text-[10px] md:text-xs font-bold uppercase tracking-[0.18em]"
          style={{ color: '#a8421d' }}
        >
          Community Event
        </span>
      </div>
    </div>
  )
}
