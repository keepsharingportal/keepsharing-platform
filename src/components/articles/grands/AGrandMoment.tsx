// AGrandMoment — soft mid-article break module for Grands. Used once
// per article to surface a memorable line — a tradition, an emotional
// takeaway, a small ritual — without competing with the big purple
// pull quote at the top. Visually softer (lavender bg, small accents)
// so it reads as a "moment" rather than a second pull quote.
//
// Position is controlled by the editor: drop an <h3>A Grand Moment</h3>
// in the body wherever you want the break, followed by the moment text
// as the very next paragraph. GrandsBodyParts pulls both out of the
// Q&A walk and remembers which Q&A pair the H3 came after so the
// renderer can insert this in the right spot.

import { Sparkles, Heart } from 'lucide-react'

interface Props {
  text: string
}

export function AGrandMoment({ text }: Props) {
  return (
    <aside className="my-8 overflow-hidden rounded-2xl border border-[#E6D3EC] bg-[#FAF6FC] p-5 shadow-[0_10px_26px_rgba(75,23,104,0.06)]">
      <div className="relative">
        {/* Subtle decorative glow — gold + teal whispers, not the page palette */}
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#F4C21B]/20 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-28 w-28 rounded-full bg-[#138F8F]/10 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#6F2C8F] ring-1 ring-[#E6D3EC]">
            <Sparkles className="h-5 w-5" strokeWidth={2.35} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6F2C8F]">
                A Grand Moment
              </p>
              <span className="h-px flex-1 bg-[#E6D3EC]" />
            </div>
            <p className="font-serif text-xl font-semibold italic leading-snug text-[#08264A]">
              {text}
            </p>
          </div>

          <Heart className="hidden h-9 w-9 shrink-0 text-[#A875BE]/35 sm:block" />
        </div>
      </div>
    </aside>
  )
}
