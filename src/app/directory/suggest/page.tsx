// /directory/suggest — community submission for a directory listing.
//
// No login required. Submitter fills out who they are + the business
// details + free-form notes. AI drafts a polished description on the
// admin side when an editor reviews; this page just captures the raw
// signal cleanly. Brand context is read server-side and stamped onto
// the submission so editors know which brand to publish under.

import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'
import { SuggestForm } from './SuggestForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await loadBrandContext()
  return {
    title:       `Suggest a Business — ${ctx.market.displayName}`,
    description: `Know a great ${ctx.market.regionLabel} business or expert? Tell us — we'll review and add them to the directory.`,
  }
}

export default async function SuggestPage() {
  const ctx = await loadBrandContext()
  const chrome = chromeForBrand(ctx.brand)
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation brandSlug={ctx.slug} chrome={chrome} />
      <main className="container py-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
          {ctx.market.regionLabel} · Directory
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
          Know a place we should feature?
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          Suggest a {ctx.market.regionLabel} business, expert, or service. Our editor reviews every submission —
          if it&apos;s a fit for {ctx.market.displayName} readers, we&apos;ll polish a listing and add them.
        </p>
        <SuggestForm brandSlug={ctx.slug} />
      </main>
      <PublicFooter brandSlug={ctx.slug} chrome={chrome} />
    </div>
  )
}
