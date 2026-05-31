// TeacherThankYouBadge — circular navy badge with a red heart, italic
// "Thank You" label, and "FOR MAKING AN IMPACT" small caps. Absolute-
// positioned to overlap the bottom-right corner of the photo card in
// the Teacher feature hero, per the mockup.

import { Heart } from 'lucide-react'

export function TeacherThankYouBadge() {
  return (
    <div className="absolute -bottom-5 -right-2 z-20 flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-[#D9A21B] bg-[#08264A] text-center text-white shadow-[0_14px_30px_rgba(8,38,74,0.28)] md:h-32 md:w-32">
      <Heart className="mb-1 h-5 w-5 text-[#E4312B] md:h-6 md:w-6" strokeWidth={2.6} />
      <p className="font-serif text-lg italic leading-none text-white md:text-xl">
        Thank You
      </p>
      <p className="mt-1.5 max-w-[80px] text-[9px] font-black uppercase leading-tight tracking-[0.12em] text-[#FFFDF8] md:mt-2 md:max-w-[90px] md:text-[10px]">
        For Making An Impact
      </p>
    </div>
  )
}
