import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingSection } from './types'

interface TeamMember {
  photo_url?: string
  name?:      string
  title?:     string
  quote?:     string
}

export function MeetTeamSection({ section }: { section: ListingSection }) {
  const members = (section.items ?? []) as TeamMember[]
  if (!section.headline && members.length === 0) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-4">{section.headline}</h3>
        )}
        {members.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {members.map((m, i) => (
              <div key={i} className="flex gap-3 bg-muted/40 rounded-2xl p-4">
                {m.photo_url ? (
                  <div className="shrink-0 w-14 h-14 rounded-full overflow-hidden bg-muted">
                    <Image
                      src={m.photo_url}
                      alt={m.name ?? 'Team member'}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="shrink-0 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {(m.name ?? '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {m.name && <p className="font-bold text-foreground text-sm">{m.name}</p>}
                  {m.title && <p className="text-xs text-primary font-medium">{m.title}</p>}
                  {m.quote && (
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1 italic">
                      &ldquo;{m.quote}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
