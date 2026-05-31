// PhotoCardWithTape — CSS-only photo-card frame with a purple washi tape
// strip centered across the top edge. The card is built entirely from
// CSS (padding + ring + shadow); no image assets for the card or tape.
// Only the photo inside is an actual image.

import Image from 'next/image'

interface Props {
  src:   string
  alt:   string
  /** Tape color — defaults to the Grands lavender. */
  tapeColor?: string
}

export function PhotoCardWithTape({ src, alt, tapeColor = '#B98BD0' }: Props) {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* Washi tape strip — slight tilt, semi-transparent, soft shadow */}
      <div
        aria-hidden="true"
        className="absolute -top-4 left-1/2 z-20 h-8 w-36 -translate-x-1/2 rotate-1 rounded-sm shadow-sm"
        style={{ backgroundColor: tapeColor + 'a6' /* ~65% opacity */ }}
      />
      {/* White photo card with rounded corners + soft drop shadow */}
      <div className="relative rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(20,20,40,0.18)] ring-1 ring-black/5">
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}
