// MomRapidFire — magazine-style Rapid Fire questions module for the
// Mom to Mom feature treatment. Cream/blush section wrapper with a
// centered serif heading flanked by sparkles + hairline rules, then a
// 2-column card grid (1-col on mobile) of numbered RapidFireCards.
//
// Per-card icons are picked by index from ICON_ROTATION since editor-
// authored rapid-fire content doesn't carry per-question metadata.
// Cycling through a small varied set gives the cards visual rhythm
// without trying to keyword-match the question text.

import type { LucideIcon } from 'lucide-react'
import {
  Sparkles, HelpCircle, Moon, ShoppingBag, Home, Coffee, Heart,
} from 'lucide-react'

const ICON_ROTATION: LucideIcon[] = [
  HelpCircle, Moon, Sparkles, ShoppingBag, Home, Coffee, Heart,
]

interface RapidFireItem {
  question: string
  answer:   string
}

interface Props {
  items: RapidFireItem[]
}

function RapidFireCard({
  number, Icon, question, answer,
}: {
  number:   string
  Icon:     LucideIcon
  question: string
  answer:   string
}) {
  return (
    <div className="rounded-xl border border-[#E8C9C6] bg-white p-4 shadow-[0_6px_18px_rgba(8,38,74,0.04)]">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCF4F2] text-[#C96F73] ring-1 ring-[#E8C9C6]">
          <span className="text-xs font-black">{number}</span>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-[#C96F73]" strokeWidth={2.3} />
        <h3 className="text-sm font-black leading-snug text-[#C96F73]">
          {question}
        </h3>
      </div>
      <p className="pl-12 text-sm font-semibold leading-snug text-[#08264A]">
        {answer}
      </p>
    </div>
  )
}

export function MomRapidFire({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-10 rounded-2xl border border-[#E8C9C6] bg-[#FFFDF8] p-5 shadow-[0_10px_28px_rgba(8,38,74,0.05)] md:p-6">
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="h-px w-12 bg-[#E8C9C6] sm:w-16" />
        <Sparkles className="h-4 w-4 text-[#C96F73]" strokeWidth={2.3} />
        <h2 className="font-serif text-xl font-bold text-[#08264A] sm:text-2xl">
          Rapid Fire Questions
        </h2>
        <Sparkles className="h-4 w-4 text-[#C96F73]" strokeWidth={2.3} />
        <span className="h-px w-12 bg-[#E8C9C6] sm:w-16" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, i) => (
          <RapidFireCard
            key={i}
            number={String(i + 1).padStart(2, '0')}
            Icon={ICON_ROTATION[i % ICON_ROTATION.length]}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </section>
  )
}
