// PlayBallSnapshotQuote — sits below the PlayBallFeatureHero inside the
// main article column. Player snapshot strip on top, lifted pull quote
// full-width directly below it. Mirrors GrandsSnapshotQuote.

import { PlayBallTopStrip } from '@/components/articles/play-ball/PlayBallTopStrip'
import { PlayBallPullQuote } from '@/components/articles/play-ball/PlayBallPullQuote'

interface FieldDef {
  key:   string
  label: string
  icon:  string
}

interface Props {
  snapshotFields: FieldDef[]
  snapshotValues: Record<string, string | null | undefined>
  pullQuote?: {
    quote:       string
    attribution: string
  } | null
}

export function PlayBallSnapshotQuote({ snapshotFields, snapshotValues, pullQuote }: Props) {
  const hasSnapshot = snapshotFields.some(f => {
    const v = snapshotValues[f.key]
    return v && String(v).trim().length > 0
  })
  if (!hasSnapshot && !pullQuote) return null

  return (
    <div className="mb-8 space-y-6">
      {hasSnapshot && (
        <PlayBallTopStrip fields={snapshotFields} values={snapshotValues} />
      )}
      {pullQuote && (
        <PlayBallPullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
      )}
    </div>
  )
}
