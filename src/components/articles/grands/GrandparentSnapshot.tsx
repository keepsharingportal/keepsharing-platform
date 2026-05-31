// GrandparentSnapshot — horizontal magazine strip. Each filled spotlight
// field renders as a centered tile (icon over uppercase label over navy
// value). Wraps responsively:
//   - mobile  : 2 columns
//   - sm/md   : 3 columns
//   - lg+     : up to 6 columns (one per filled field, capped by count)
//
// This layout mirrors the print magazine's banner-across-the-top of
// nicknames + vitals, and lets the pull quote sit full-width directly
// below without a height-mismatch.

import type { LucideIcon } from 'lucide-react'
import { Users, Heart, BookOpen, Flag, Calendar, Sparkles, Award, Star } from 'lucide-react'

const ICON_BY_TEMPLATE_ICON: Record<string, LucideIcon> = {
  Users, Heart, BookOpen, Flag, Calendar, Sparkles, Award, Star,
}

interface FieldDef {
  key:   string
  label: string
  icon:  string
}

interface Props {
  /** Ordered list of fields to potentially show (from the GRAND template). */
  fields: FieldDef[]
  /** Filled values keyed by field key. */
  values: Record<string, string | null | undefined>
}

// Pick a grid-cols class for the lg breakpoint based on the number of
// filled fields. Capped at 6 — beyond that we wrap to a second row.
// Tailwind needs the class strings present at build time, so explicit
// map (no string interpolation).
const LG_COLS_BY_COUNT: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
}

export function GrandparentSnapshot({ fields, values }: Props) {
  const filled = fields.filter(f => {
    const v = values[f.key]
    return v && String(v).trim().length > 0
  })
  if (filled.length === 0) return null

  const lgCols = LG_COLS_BY_COUNT[Math.min(filled.length, 6)] ?? 'lg:grid-cols-6'

  return (
    <section className="rounded-2xl border border-[#E8D8EE] bg-white/95 p-5 md:p-6 shadow-[0_12px_30px_rgba(75,23,104,0.08)]">
      <h2 className="mb-5 text-center text-xs font-black uppercase tracking-[0.18em] text-[#6F2C8F]">
        Grandparent Snapshot
      </h2>
      <div className={`grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 ${lgCols}`}>
        {filled.map(field => {
          const Icon = ICON_BY_TEMPLATE_ICON[field.icon] ?? Star
          return (
            <div key={field.key} className="flex flex-col items-center px-1 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4EAF7] text-[#6F2C8F] ring-1 ring-[#E4C8EE]">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {field.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-snug text-[#08264A] break-words">
                {String(values[field.key]).trim()}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
