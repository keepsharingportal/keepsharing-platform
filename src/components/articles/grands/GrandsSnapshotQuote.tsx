// GrandsSnapshotQuote — the row that sits below the GrandsFeatureHero,
// inside the main article column. Two-column on desktop (snapshot left,
// pull quote right); stacks on mobile (snapshot first, then quote).
//
// Rendered inside the main col so the sidebar (sponsor / newsletter /
// trending) sits alongside, starting from the same vertical position.

import { GrandparentSnapshot } from '@/components/articles/grands/GrandparentSnapshot'
import { PullQuote }            from '@/components/articles/grands/PullQuote'

interface Props {
  snapshot: {
    grandkids?:  string | null
    nickname?:   string | null
    traditions?: string | null
  }
  pullQuote?: {
    quote:       string
    attribution: string
  } | null
}

export function GrandsSnapshotQuote({ snapshot, pullQuote }: Props) {
  const hasSnapshot = snapshot.grandkids || snapshot.nickname || snapshot.traditions
  if (!hasSnapshot && !pullQuote) return null

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_1.5fr]">
      {hasSnapshot ? (
        <GrandparentSnapshot
          grandkids={snapshot.grandkids}
          nickname={snapshot.nickname}
          traditions={snapshot.traditions}
        />
      ) : <div />}
      {pullQuote && (
        <PullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
      )}
    </div>
  )
}
