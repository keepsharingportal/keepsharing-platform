'use client'

import { Card } from '@/components/ui/card'
import { MapPin, ExternalLink } from 'lucide-react'

interface Props {
  address?: string | null
  cityStateZip?: string | null
  businessName: string
}

export function ListingMap({ address, cityStateZip, businessName }: Props) {
  const fullAddress = [address, cityStateZip].filter(Boolean).join(', ')
  if (!fullAddress) return null

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  const mapPreviewUrl = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80&auto=format&fit=crop'

  return (
    <Card className="overflow-hidden">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${businessName} on Google Maps`}
        className="block h-56 bg-muted relative flex items-center justify-center group cursor-pointer"
      >
        <div
          className="absolute inset-0 opacity-40 transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url("${mapPreviewUrl}")`,
            backgroundSize: 'cover',
            filter: 'grayscale(100%)',
          }}
        />
        <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
        <div className="z-10 text-center bg-background/95 p-4 rounded-xl shadow-lg backdrop-blur border border-border/50 group-hover:border-primary/50 transition-colors mx-4">
          <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
          <span className="font-bold block text-foreground">View on Google Maps</span>
          <span className="text-xs text-muted-foreground">{fullAddress}</span>
          <span className="flex items-center justify-center gap-1 text-xs text-primary mt-2 font-medium">
            Open in Maps <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </a>
    </Card>
  )
}
