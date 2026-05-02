import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface Props {
  guideName: string
  guideUrlSlug: string
}

export function SectionSponsorBanner({ guideName }: Props) {
  return (
    <Card className="bg-primary/5 border-primary/20 overflow-hidden">
      <CardContent className="p-6 md:p-7">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
          <div>
            <h3 className="font-bold text-foreground mb-2">
              {guideName} — sponsorship available
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Be the first name families see when they choose where to send their kids. One business earns exclusive section sponsor status each year.
            </p>
          </div>
          <Button asChild className="rounded-full whitespace-nowrap">
            <Link href="/advertise">
              Learn more <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
