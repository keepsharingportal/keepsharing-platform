// GrandsSnapshotQuote — sits below the GrandsFeatureHero inside the main
// article column. Two-column on desktop (snapshot left, pull quote right);
// stacks on mobile.

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
    <div className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_1.5fr]">
      {hasSnapshot ? (
        <GrandparentSnapshot fields={snapshotFields} values={snapshotValues} />
      ) : <div />}
      {pullQuote && (
        <PullQuote quote={pullQuote.quote} attribution={pullQuote.attribution} />
      )}
    </div>
  )
}
