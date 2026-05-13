import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { MapPin, ArrowRight } from 'lucide-react'

export interface GuideTrendingListingData {
  id: string
  business_name: string
  editorial_blurb?: string | null
  cover_image_url?: string | null
  logo_url?: string | null
  city?: string | null
  address?: string | null
}

interface Props {
  listing: GuideTrendingListingData
  href: string
  badgeLabel?: string
  ctaLabel?: string
}

/**
 * Horizontal listing card for "Trending Resources" sections in guide pages.
 * Uses shadcn Card with image-left, content-right layout.
 */
export function GuideTrendingCard({
  listing, href,
  badgeLabel = 'Verified Partner',
  ctaLabel = 'Learn More',
}: Props) {
  const imgSrc = listing.cover_image_url ?? listing.logo_url

  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300 bg-card">
      <Link href={href} className="flex p-4 gap-5">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0 relative bg-muted">
          {imgSrc && (
            <Image
              src={imgSrc}
              alt={listing.business_name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized
            />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-tighter self-start">
            {badgeLabel}
          </Badge>
          <h4 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">
            {listing.business_name}
          </h4>
          {listing.editorial_blurb && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {listing.editorial_blurb}
            </p>
          )}
          {(listing.city ?? listing.address) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3 w-3 shrink-0" />
              {listing.city ?? listing.address}
            </div>
          )}
          <div className="mt-3 flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
            {ctaLabel} <ArrowRight className="ml-1 h-3 w-3" />
          </div>
        </div>
      </Link>
    </Card>
  )
}
