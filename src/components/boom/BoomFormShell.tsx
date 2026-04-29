'use client'

import Link from 'next/link'

const NAVY    = '#0B1829'
const NAVY_2  = '#112035'
const GOLD    = '#C9A84B'
const CREAM   = '#F4EFE4'
const DIM     = '#9A9288'
const BORDER  = '#1E3558'

export const boomInput  = `w-full px-4 py-3 text-base rounded-xl outline-none transition-all`
export const boomLabel  = `block text-sm font-semibold mb-1.5`
export const boomInput2 = `bg-[#162844] text-[#F4EFE4] border border-[#1E3558] focus:border-[#C9A84B]`

interface Props {
  title: string
  subtitle: string
  department: string
  children: React.ReactNode
}

export function BoomFormShell({ title, subtitle, department, children }: Props) {
  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: NAVY, fontFamily: 'Georgia, "Times New Roman", serif', color: CREAM }}>
      <div className="max-w-2xl mx-auto">
        {/* Back nav */}
        <Link href="/boom" className="text-xs font-bold uppercase tracking-wider mb-6 inline-block hover:opacity-80" style={{ color: GOLD }}>
          ← River Region Boom
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: GOLD }}>{department}</div>
          <h1 className="text-3xl font-bold leading-tight mb-2">{title}</h1>
          <p className="text-base leading-relaxed" style={{ color: '#D8D0C0' }}>{subtitle}</p>
          <div className="h-px w-16 mt-5" style={{ backgroundColor: GOLD }} />
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: NAVY_2, border: `1px solid ${BORDER}` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export { NAVY, NAVY_2, GOLD, CREAM, DIM, BORDER }
