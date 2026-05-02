import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ExternalLink } from 'lucide-react'

interface Props {
  address?: string | null
  cityStateZip?: string | null
  businessName: string
}

export function ListingMap({ address, cityStateZip, businessName }: Props) {
  const fullAddress = [address, cityStateZip].filter(Boolean).join(', ')
  if (!fullAddress) return null

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`
  const directionsUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        <iframe
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${businessName}`}
          className="absolute inset-0"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{fullAddress}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full rounded-full">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            Get Directions <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
