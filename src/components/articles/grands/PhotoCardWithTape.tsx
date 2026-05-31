// PhotoCardWithTape — CSS-only photo-card frame with a purple washi tape
// strip centered across the top edge.
//
// Tape texture: bg-purple-300/55 base + white/20 overlay (mimics the matte
// "wax-paper" quality of real washi tape per the spec), plus a thin
// bottom-edge shadow so the bottom of the tape reads as a physical edge.
// Card: rounded white frame + soft drop shadow + ring-1 ring-black/5.
// Slight tilt + heavier shadow so the card reads as a placed-on-the-page
// photo rather than a flat hero image.

import Image from 'next/image'

interface Props {
  src:   string
  alt:   string
}

export function PhotoCardWithTape({ src, alt }: Props) {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Washi tape strip — slight tilt, layered for texture */}
      <div
        aria-hidden="true"
        className="absolute -top-4 left-1/2 z-20 h-8 w-32 md:w-36 -translate-x-1/2 rotate-1 rounded-sm shadow-sm overflow-hidden"
        style={{ backgroundColor: '#d8b4fe8c' /* purple-300 @ ~55% */ }}
      >
        {/* White matte overlay — gives the tape that "wax-paper" quality */}
        <div className="absolute inset-0 bg-white/20" />
        {/* Bottom edge shadow line — makes the tape's bottom edge readable
            as a physical edge instead of a flat color block. */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/12" />
      </div>

      {/* White photo card — slight rotation, soft heavy shadow */}
      <div className="relative rounded-2xl bg-white p-3 shadow-[0_18px_45px_rgba(20,20,40,0.18)] ring-1 ring-black/5 -rotate-[0.8deg] md:-rotate-[1deg] origin-center">
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
