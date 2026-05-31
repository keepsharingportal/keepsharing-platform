// GrandsSnapshotQuote — sits below the GrandsFeatureHero inside the
// main article column. Snapshot strip on top (responsive horizontal
// grid), pull quote full-width directly below it. Stacking like this
// avoids the height-mismatch you get when a 6-item vertical card sits
// beside a single-line quote.

import { GrandparentSnapshot } from '@/components/articles/grands/GrandparentSnapshot'
import { PullQuote }            from '@/components/articles/grands/PullQuote'

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

export function GrandsSnapshotQuote({ snapshotFields, snapshotValues, pullQuote }: Props) {
  const hasSnapshot = snapshotFields.some(f => {
    const v = snapshotValues[f.key]
    return v && String(v).trim().length > 0
  })
  if (!hasSnapshot && !pullQuote) return null

  return (
    <div className="mb-8 space-y-6">
      {hasSnapshot && (
        <GrandparentSnapshot fields={snapshotFields} values={snapshotValues} />
      )}
      {pullQuote && (
        <PullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
      )}
    </div>
  )
}
