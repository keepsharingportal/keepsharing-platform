// /directory/[slug] — directory listing detail.
//
// Brand-scoped (404s if the slug belongs to a different brand). Surfaces
// the full description, contact info, hours, location, and any related
// articles tagged with this listing's name.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { MapPin, Phone, Mail, Globe, Clock, ArrowLeft, Star } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { FavoriteButton } from '@/components/reader/FavoriteButton'
import { EngagementBeacon } from '@/components/reader/EngagementBeacon'
import { EngagementNudge } from '@/components/reader/EngagementNudge'
import { loadBrandContext } from '@/lib/brand-context'
import { chromeForBrand } from '@/lib/brands'

export const revalidate = 600

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface PageProps {
  params: Promise<{ slug: string }>
}

interface ListingRow {
  id: string; slug: string; name: string; summary: string | null; description: string | null;
  hero_image_url: string | null; category_slugs: string[]; kind: string;
  city: string | null; state: string | null; address: string | null; zip: string | null;
  phone: string | null; website: string | null; email: string | null; hours: string | null;
  is_featured: boolean; brand_slug: string;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const ctx = await loadBrandContext()
  const sb  = getSupabase()
  const { data } = await sb
    .from('directory_listings')
    .select('name, summary')
    .eq('brand_slug', ctx.slug)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  const row = data as { name: string; summary: string | null } | null
  if (!row) return { title: `Listing — ${ctx.market.displayName}` }
  return {
    title:       `${row.name} — ${ctx.market.displayName}`,
    description: row.summary ?? `${row.name} in the ${ctx.market.regionLabel} area, curated by ${ctx.market.displayName}.`,
  }
}

export default async function DirectoryListingPage({ params }: PageProps) {
  const { slug } = await params
  const ctx    = await loadBrandContext()
  const chrome = chromeForBrand(ctx.brand)
  const sb     = getSupabase()

  const { data } = await sb
    .from('directory_listings')
    .select('id, slug, name, summary, description, hero_image_url, category_slugs, kind, city, state, address, zip, phone, website, email, hours, is_featured, brand_slug')
    .eq('brand_slug', ctx.slug)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  const listing = data as ListingRow | null
  if (!listing) notFound()

  // Resolve category names for the chip rail.
  const { data: catData } = listing.category_slugs.length > 0
    ? await sb.from('directory_categories')
        .select('slug, name, emoji')
        .eq('brand_slug', ctx.slug)
        .in('slug', listing.category_slugs)
    : { data: [] as Array<{ slug: string; name: string; emoji: string | null }> }
  const categories = (catData ?? []) as Array<{ slug: string; name: string; emoji: string | null }>

  // Related listings — same category, exclude self, up to 4.
  const { data: relatedData } = listing.category_slugs.length > 0
    ? await sb.from('directory_listings')
        .select('id, slug, name, summary, hero_image_url, city, state')
        .eq('brand_slug', ctx.slug)
        .eq('status', 'published')
        .neq('id', listing.id)
        .overlaps('category_slugs', listing.category_slugs)
        .limit(4)
    : { data: [] as Array<{ id: string; slug: string; name: string; summary: string | null; hero_image_url: string | null; city: string | null; state: string | null }> }
  const related = (relatedData ?? [])

  // Fire-and-forget view counter bump.
  void sb.rpc('increment_directory_view', { p_id: listing.id }).then(() => undefined, () => undefined)

  return (
    <div className="min-h-screen bg-background public-page">
      <EngagementBeacon brandSlug={ctx.slug} kind="directory" />
      <EngagementNudge brandSlug={ctx.slug} brandName={ctx.market.displayName} />
      <Navigation brandSlug={ctx.slug} chrome={chrome} />

      <article className="container py-8 max-w-4xl">
        <Link href="/directory" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={11} /> Back to directory
        </Link>

        {/* Hero */}
        {listing.hero_image_url ? (
          <div className="rounded-2xl overflow-hidden border border-border mb-6 relative aspect-[16/9] bg-muted">
            <Image
              src={listing.hero_image_url}
              alt={listing.name}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              priority
            />
            {listing.is_featured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                <Star size={9} /> Featured
              </span>
            )}
          </div>
        ) : null}

        {/* Title */}
        <header className="mb-6">
          {categories.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {categories.map(c => (
                <Link
                  key={c.slug}
                  href={`/directory?category=${c.slug}`}
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
                >
                  {c.emoji} {c.name}
                </Link>
              ))}
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">
              {listing.name}
            </h1>
            <FavoriteButton
              brandSlug={ctx.slug}
              targetKind="directory_listing"
              targetId={listing.id}
              targetTitle={listing.name}
              targetSlug={listing.slug}
              targetUrl={`/directory/${listing.slug}`}
            />
          </div>
          {listing.summary && (
            <p className="text-base text-muted-foreground leading-relaxed">{listing.summary}</p>
          )}
        </header>

        <div className="grid md:grid-cols-[1fr_18rem] gap-8">
          {/* Description */}
          <div>
            {listing.description ? (
              <div className="prose prose-neutral max-w-none">
                {listing.description.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">Description coming soon.</p>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Get in touch</h3>
              {listing.phone && (
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-primary shrink-0 mt-0.5" />
                  <a href={`tel:${listing.phone}`} className="text-foreground hover:text-primary">{listing.phone}</a>
                </div>
              )}
              {listing.email && (
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-primary shrink-0 mt-0.5" />
                  <a href={`mailto:${listing.email}`} className="text-foreground hover:text-primary break-all">{listing.email}</a>
                </div>
              )}
              {listing.website && (
                <div className="flex items-start gap-2">
                  <Globe size={14} className="text-primary shrink-0 mt-0.5" />
                  <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary break-all">
                    {listing.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              )}
              {(listing.address || listing.city) && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="text-foreground">
                    {listing.address && <div>{listing.address}</div>}
                    {(listing.city || listing.state) && (
                      <div>{[listing.city, listing.state, listing.zip].filter(Boolean).join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
              {listing.hours && (
                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-primary shrink-0 mt-0.5" />
                  <div className="text-foreground whitespace-pre-line">{listing.hours}</div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">More in this category</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(r => (
                <Link key={r.id} href={`/directory/${r.slug}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary hover:shadow-sm transition-all flex gap-3">
                  {r.hero_image_url ? (
                    <Image src={r.hero_image_url} alt={r.name} width={80} height={80} className="rounded-lg object-cover w-20 h-20" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-2xl text-muted-foreground/30">📌</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground leading-tight">{r.name}</h3>
                    {r.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
                    {(r.city || r.state) && (
                      <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <MapPin size={9} /> {[r.city, r.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <PublicFooter brandSlug={ctx.slug} chrome={chrome} />
    </div>
  )
}
