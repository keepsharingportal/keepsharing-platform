import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface Props {
  guideName: string
  listingCount: number
}

export function GuideMapCard({ guideName, listingCount }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-secondary/10 flex items-center justify-center">
        <div className="text-center p-6">
          <MapPin className="h-10 w-10 text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-medium">
            {listingCount} {guideName} locations
          </p>
          <p className="text-xs text-muted-foreground mt-1">across the River Region</p>
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
