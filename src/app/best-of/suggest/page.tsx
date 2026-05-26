// /best-of/suggest — reader-facing form for nominating Best Of picks.
// Posts to /api/best-of/suggest. Categories are curated (most common
// list themes) with "Other" for write-ins so the team can spot fresh
// list ideas the readers ask for.

import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { BestOfSuggestForm } from './BestOfSuggestForm'

export const metadata: Metadata = {
  title:       'Suggest a Best Of — River Region Parents',
  description: 'Tell us what River Region families should put on the next Best Of list.',
}

export default function BestOfSuggestPage() {
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <main className="container py-10 md:py-14 max-w-2xl">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-1">
            The
          </p>
          <h1 className="font-serif font-black leading-[0.9] tracking-tight text-foreground text-4xl sm:text-5xl mb-1">
            BEST <span className="font-light italic text-muted-foreground text-2xl sm:text-3xl align-baseline">of</span>
          </h1>
          <p className="text-base md:text-lg font-bold tracking-wide italic mt-0.5 mb-4">
            <span className="text-foreground">for River Region </span>
            <span className="text-primary not-italic">Families</span>
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight mb-2">
            Tell us your Best Of
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            We&apos;re building new Best Of lists all year. If a local spot has earned a place on
            the next list, drop the name below — your suggestion lands with our editors.
          </p>
        </div>

        <BestOfSuggestForm />
      </main>

      <PublicFooter />
    </div>
  )
}
