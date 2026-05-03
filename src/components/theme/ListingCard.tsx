import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, ChevronRight } from 'lucide-react'
import { getFallbackByContext } from '@/lib/image-fallbacks'
import { ListingBadges } from '@/components/listings/ListingBadges'

interface ListingData {
  id:                     string
  slug:                   string
  business_name:          string
  card_hook?:             string | null
  hero_photo_url?:        string | null
  neighborhood?:          string | null
  city_state_zip?:        string | null
  has_military_discount?: boolean | null
  is_veteran_owned?:      boolean | null
  is_woman_owned?:        boolean | null
  is_minority_owned?:     boolean | null
  is_locally_owned?:      boolean | null
}

interface Props {
  listing:        ListingData
  guideUrlSlug:   string
  guideContext:   string
  variant?:       'standard' | 'featured'
}

export function ListingCard({ listing, guideUrlSlug, guideContext, variant = 'standard' }: Props) {
  const heroSrc = listing.hero_photo_url || getFallbackByContext(guideContext, listing.slug)

  if (variant === 'featured') {
    return (
      <div className="overflow-hidden rounded-2xl border border-accent/30 shadow-sm hover:shadow-md transition-shadow bg-card">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 relative aspect-video md:aspect-auto">
            <Image
              src={heroSrc}
              alt={listing.business_name}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <Badge variant="accent" className="absolute top-3 left-3">Featured Partner</Badge>
          </div>
          <div className="p-6 md:w-2/3 flex flex-col">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{listing.business_name}</h3>
            {listing.card_hook && (
              <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2">
                {listing.card_hook}
              </p>
            )}
            <ListingBadges
              hasMilitaryDiscount={listing.has_military_discount}
              isVeteranOwned={listing.is_veteran_owned}
              isWomanOwned={listing.is_woman_owned}
              isMinorityOwned={listing.is_minority_owned}
              isLocallyOwned={listing.is_locally_owned}
              className="mb-3"
            />
            {(listing.neighborhood ?? listing.city_state_zip) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
                <MapPin className="h-3 w-3" />
                {listing.neighborhood ?? listing.city_state_zip}
              </p>
            )}
            <Button asChild size="sm" className="self-start rounded-full">
              <Link href={`/${guideUrlSlug}/listings/${listing.slug}`}>View Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link href={`/${guideUrlSlug}/listings/${listing.slug}`} className="group block h-full">
      <div className="overflow-hidden rounded-2xl border border-border hover:border-primary/30 hover:shadow-sm transition-all bg-card flex flex-col h-full">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            src={heroSrc}
            alt={listing.business_name}
            fill
            style={{ objectFit: 'cover' }}
            className="group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 33vw"
            unoptimized
          />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{listing.business_name}</h3>
          {(listing.neighborhood ?? listing.city_state_zip) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />
              {listing.neighborhood ?? listing.city_state_zip}
            </p>
          )}
          {listing.card_hook && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-2">{listing.card_hook}</p>
          )}
          <span className="text-primary text-sm font-medium flex items-center gap-1 mt-auto">
            View Details <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}
