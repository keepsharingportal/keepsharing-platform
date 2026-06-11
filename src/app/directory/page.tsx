// /directory — brand-scoped local business + expert directory index.
//
// Layout:
//   - Featured listings (paid + editor-curated) at the top
//   - Category tiles to browse by topic
//   - Search box (linked GET to ?q=)
//   - Recent additions feed at the bottom
//
// All data is filtered to the current brand context so an Auburn-Opelika
// reader sees Auburn businesses, not Mobile Bay ones.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Search, MapPin, ArrowRight, Star } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'

export const revalidate = 900

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string }>
}

interface ListingRow {
  id: string; slug: string; name: string; summary: string | null;
  hero_image_url: string | null; category_slugs: string[];
  city: string | null; state: string | null; is_featured: boolean; kind: string;
}

interface CategoryRow {
  slug: string; name: string; emoji: string | null; description: string | null;
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await loadBrandContext()
  return {
    title:       `${ctx.market.regionLabel} Local Directory — ${ctx.market.displayName}`,
    description: `Local businesses and trusted experts in the ${ctx.market.regionLabel} area, curated by ${ctx.market.displayName}.`,
  }
}

export default async function DirectoryIndexPage({ searchParams }: PageProps) {
  const { q, category } = await searchParams
  const ctx    = await loadBrandContext()
  const chrome = chromeForBrand(ctx.brand)
  const sb     = getSupabase()

  let migrated = true
  let categories: CategoryRow[] = []
  let featured:   ListingRow[]  = []
  let listings:   ListingRow[]  = []

  try {
    const probe = await sb.from('directory_listings').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) migrated = false
  } catch { migrated = false }

  if (migrated) {
    const { data: cData } = await sb
      .from('directory_categories')
      .select('slug, name, emoji, description')
      .eq('brand_slug', ctx.slug)
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })
    categories = (cData ?? []) as CategoryRow[]

    let baseQ = sb
      .from('directory_listings')
      .select('id, slug, name, summary, hero_image_url, category_slugs, city, state, is_featured, kind')
      .eq('brand_slug', ctx.slug)
      .eq('status', 'published')

    if (category) baseQ = baseQ.contains('category_slugs', [category])
    if (q && q.trim().length >= 2) {
      const safe = q.trim().replace(/[%,]/g, ' ')
      baseQ = baseQ.or(`name.ilike.%${safe}%,summary.ilike.%${safe}%`)
    }

    const { data: fData } = await baseQ.eq('is_featured', true).limit(6)
    featured = (fData ?? []) as ListingRow[]

    const { data: lData } = await baseQ.order('name').limit(48)
    listings = (lData ?? []) as ListingRow[]
  }

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation brandSlug={ctx.slug} chrome={chrome} />

      <header className="border-b bg-muted/30">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
            {ctx.market.regionLabel} · Local Directory
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-3">
            Find the people, places, and pros locals trust.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            A curated directory of {ctx.market.regionLabel} businesses and experts —
            independent of advertising. Browse a category or search by name.
          </p>

          <form action="/directory" className="mt-6 max-w-xl">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search by name or what you need…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-base outline-none focus:border-primary"
              />
              {category && <input type="hidden" name="category" value={category} />}
            </div>
          </form>

          <div className="mt-4 flex gap-2 flex-wrap">
            <Link
              href="/directory/suggest"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Suggest a business <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-10 space-y-10">
        {!migrated && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Directory migration not yet applied. Run <code className="bg-white px-1 rounded">163_local_directory.sql</code> to enable.
          </div>
        )}

        {/* Featured listings */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Star size={14} className="text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Featured this month</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map(l => <ListingCard key={l.id} listing={l} featured />)}
            </div>
          </section>
        )}

        {/* Category tiles */}
        {!q && !category && categories.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Browse by category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map(c => (
                <Link
                  key={c.slug}
                  href={`/directory?category=${c.slug}`}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-2xl mb-1">{c.emoji ?? '📌'}</div>
                  <div className="text-sm font-bold text-foreground leading-tight">{c.name}</div>
                  {c.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All matching listings */}
        <section>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {category
                ? `${categories.find(c => c.slug === category)?.name ?? category}`
                : q
                  ? `Matches for "${q}"`
                  : 'All listings'}
            </h2>
            {(category || q) && (
              <Link href="/directory" className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Clear filter
              </Link>
            )}
          </div>
          {listings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {q || category ? 'Nothing matched. Try a different search.' : 'No listings published yet.'}
              {' '}
              <Link href="/directory/suggest" className="text-primary hover:underline font-semibold">
                Know one? Suggest it.
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>
      </main>

      <PublicFooter brandSlug={ctx.slug} chrome={chrome} />
    </div>
  )
}

function ListingCard({ listing, featured }: { listing: ListingRow; featured?: boolean }) {
  return (
    <Link
      href={`/directory/${listing.slug}`}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary hover:shadow-md transition-all flex flex-col"
    >
      {listing.hero_image_url ? (
        <div className="aspect-[16/10] relative bg-muted overflow-hidden">
          <Image
            src={listing.hero_image_url}
            alt={listing.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105 transition-transform"
          />
          {featured && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              <Star size={9} /> Featured
            </span>
          )}
        </div>
      ) : (
        <div className="aspect-[16/10] bg-muted flex items-center justify-center text-3xl text-muted-foreground/30">
          📌
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
          {listing.name}
        </h3>
        {listing.summary && (
          <p className="text-sm text-muted-foreground mt-1 leading-snug line-clamp-2">{listing.summary}</p>
        )}
        {(listing.city || listing.state) && (
          <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
            <MapPin size={10} /> {[listing.city, listing.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </Link>
  )
}
