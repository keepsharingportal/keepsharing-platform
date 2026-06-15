// ── Root not-found.tsx ──────────────────────────────────────────────────────
//
// Catches any 404 across the entire app. Renders a brand-aware friendly
// page AND fires a fire-and-forget POST to /api/log/not-found so the
// admin's 404 monitor sees the hit and can turn it into a redirect.

import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Search, Home, ArrowRight } from 'lucide-react'
import { headers } from 'next/headers'
import { NotFoundLogger } from './NotFoundLogger'

export default async function NotFound() {
  // Pull the path the user tried to visit out of the request headers
  // (Next.js exposes it via the referrer + custom middleware header).
  // The logger client component fires the POST.
  const h = await headers()
  const path = h.get('x-next-pathname') ?? h.get('next-url') ?? ''

  return (
    <div className="min-h-screen bg-background">
      <NotFoundLogger path={path} />
      <Navigation />
      <main className="container py-16 md:py-24 max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">404</p>
        <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-4">
          We can&apos;t find that page.
        </h1>
        <p className="text-base md:text-lg text-foreground/70 leading-relaxed mb-8">
          The page you&apos;re looking for may have moved, been renamed, or never existed.
          Try one of these instead, or search the archive.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm px-6 py-3 hover:opacity-90"
          >
            <Home className="h-4 w-4" /> Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-card border border-border font-bold text-sm px-6 py-3 hover:bg-muted/40"
          >
            <Search className="h-4 w-4" /> Search the archive
          </Link>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Popular</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <NavLink href="/calendar"               label="Family Calendar" />
            <NavLink href="/school-zone"            label="School Zone" />
            <NavLink href="/family-resource-guide"  label="Family Resource Guide" />
            <NavLink href="/articles"               label="Articles" />
            <NavLink href="/games"                  label="Brain Games" />
            <NavLink href="/mom-knows-best"         label="Mom Knows Best" />
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}
