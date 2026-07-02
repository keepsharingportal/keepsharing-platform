import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Phone, Globe, ChevronRight, Star } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ListingBadges } from '@/components/listings/ListingBadges'

export interface ListingData {
  id:                     string
  slug:                   string
  business_name:          string
  card_hook?:             string | null
  hero_photo_url?:        string | null
  neighborhood?:          string | null
  city_state_zip?:        string | null
  website_url?:           string | null
  office_phone?:          string | null
  has_military_discount?: boolean | null
  is_veteran_owned?:      boolean | null
  is_woman_owned?:        boolean | null
  is_minority_owned?:     boolean | null
  is_locally_owned?:      boolean | null
}

interface Props {
  listing:      ListingData
  guideUrlSlug: string
  guideContext: string
  // 'compact' is for free / non-featured listings on directory pages
  // where featured tier should win visually — small list-row with no
  // photo, ~1/3 the vertical space of 'standard'.
  variant?:     'standard' | 'featured' | 'compact'
}

function fmtPhone(p: string | null | undefined): string | null {
  if (!p) return null
  const digits = p.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  return p
}

function rootDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') }
  catch { return url }
}

export function ListingCard({ listing, guideUrlSlug, guideContext, variant = 'standard' }: Props) {
  const heroSrc = listing.hero_photo_url || getFallbackByContext(guideContext, listing.slug)
  const phone   = fmtPhone(listing.office_phone)
  const domain  = rootDomain(listing.website_url)
  const location = listing.neighborhood ?? listing.city_state_zip ?? null

  /* ── Featured / Partner ───────────────────────────────────────────────── */
  if (variant === 'featured') {
    return (
      <div className="overflow-hidden rounded-2xl border border-accent/50 shadow-md hover:shadow-lg transition-shadow bg-card">
        {/* Accent top stripe — visually separates featured from standard */}
        <div className="h-1 bg-gradient-to-r from-accent via-accent/80 to-accent/50" />
        <div className="flex flex-col md:flex-row">
          <div className="md:w-2/5 relative aspect-video md:aspect-auto min-h-[180px]">
            <Image
              src={heroSrc} alt={listing.business_name} fill
              style={{ objectFit: 'cover' }} unoptimized sizes="(max-width: 768px) 100vw, 40vw"
            />
            <Badge variant="accent" className="absolute top-3 left-3 shadow-sm">
              <Star className="h-3 w-3 mr-1 fill-current" /> Featured Partner
            </Badge>
          </div>
          <div className="p-5 md:w-3/5 flex flex-col gap-3">
            <div>
              <h3 className="text-xl font-bold text-foreground">{listing.business_name}</h3>
              {location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {location}
                </p>
              )}
            </div>

            {listing.card_hook && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                {listing.card_hook}
              </p>
            )}

            <ListingBadges
              hasMilitaryDiscount={listing.has_military_discount}
              isVeteranOwned={listing.is_veteran_owned}
              isWomanOwned={listing.is_woman_owned}
              isMinorityOwned={listing.is_minority_owned}
              isLocallyOwned={listing.is_locally_owned}
              className="flex-wrap"
            />

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {phone && (
                <a href={`tel:${listing.office_phone}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors font-medium">
                  <Phone className="h-3.5 w-3.5" /> {phone}
                </a>
              )}
              {domain && listing.website_url && (
                <a href={listing.website_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors font-medium">
                  <Globe className="h-3.5 w-3.5" /> {domain}
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 mt-auto">
              <Button asChild size="sm" className="rounded-full">
                <Link href={`/${guideUrlSlug}/listings/${listing.slug}`}>View Full Profile</Link>
              </Button>
              {listing.website_url && (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <a href={listing.website_url} target="_blank" rel="noopener noreferrer">Visit Website</a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Compact (free tier on directory pages) ──────────────────────────── */
  // Self-sufficient list row — no click-through to a detail page,
  // because directory-only listings have nothing there worth the tap
  // beyond the description that's already on the card. Instead: full
  // description with a 2-line clamp, phone as a tel: link, website as
  // an external link. Parents get what they need without leaving the
  // category page.
  //
  // Featured tier still gets the standard/featured variant with a
  // click-through — where an advertiser has actually filled in a
  // gallery / packages / hours worth showing off.
  if (variant === 'compact') {
    const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
    const webHref = listing.website_url
      ? (listing.website_url.startsWith('http') ? listing.website_url : `https://${listing.website_url}`)
      : null
    return (
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <h3 className="font-bold text-sm text-foreground leading-snug">
          {listing.business_name}
        </h3>
        {location && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" /> {location}
          </p>
        )}
        {listing.card_hook && (
          <p className="text-[13px] text-foreground/75 leading-relaxed mt-1.5 line-clamp-3">
            {listing.card_hook}
          </p>
        )}
        {(telHref || webHref) && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            {telHref && phone && (
              <a
                href={telHref}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground bg-muted/60 hover:bg-muted rounded-full px-2.5 py-1 transition-colors"
              >
                <Phone className="h-3 w-3" /> {phone}
              </a>
            )}
            {webHref && domain && (
              <a
                href={webHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 rounded-full px-2.5 py-1 border border-primary/30 hover:border-primary/50 transition-colors max-w-[200px]"
              >
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{domain}</span>
              </a>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ── Standard ─────────────────────────────────────────────────────────── */
  return (
    <Link href={`/${guideUrlSlug}/listings/${listing.slug}`} className="group block h-full">
      <div className="overflow-hidden rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all bg-card flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
          <Image
            src={heroSrc} alt={listing.business_name} fill
            style={{ objectFit: 'cover' }}
            className="group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 33vw" unoptimized
          />
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 gap-1.5">
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
            {listing.business_name}
          </h3>

          {location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" /> {location}
            </p>
          )}

          {listing.card_hook && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
              {listing.card_hook}
            </p>
          )}

          {/* Contact row */}
          {(phone || domain) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
              {phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {phone}
                </span>
              )}
              {domain && (
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <Globe className="h-3 w-3 shrink-0" /> {domain}
                </span>
              )}
            </div>
          )}

          <span className="text-primary text-sm font-semibold flex items-center gap-1 mt-auto pt-1">
            View Details <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}
