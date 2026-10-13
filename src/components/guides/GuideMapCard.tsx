import { Card, CardContent } from '@/components/ui/card'
import { theRegion } from '@/lib/brandify'
import { loadBrandContext } from '@/lib/brand-context'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface Props {
  guideName: string
  listingCount: number
}

export async function GuideMapCard({ guideName, listingCount }: Props) {
  const { market } = await loadBrandContext()
  const regionPhrase = theRegion(market)
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-secondary/10 flex items-center justify-center">
        <div className="text-center p-6">
          <MapPin className="h-10 w-10 text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            {listingCount} {guideName} locations
          </p>
          <p className="text-xs text-muted-foreground mt-1">across {regionPhrase}</p>
        </div>
      </div>
      <CardContent className="p-4">
        <Button variant="outline" size="sm" className="w-full rounded-full" disabled>
          Map view coming soon
        </Button>
      </CardContent>
    </Card>
  )
}
