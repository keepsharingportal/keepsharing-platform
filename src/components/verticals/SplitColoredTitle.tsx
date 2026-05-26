// SplitColoredTitle — two-tone title treatment matching the "River Region
// [Parents]" pattern in the global nav. For multi-word titles, only the
// LAST word goes coral; for single-word titles, the whole word goes coral.
//
//   <SplitColoredTitle title="School Zone" />          → "School " + "Zone" (coral)
//   <SplitColoredTitle title="Family Resource Guide" /> → "Family Resource " + "Guide" (coral)
//   <SplitColoredTitle title="Articles" />              → "Articles" (coral)
//
// The accent color is inherited via Tailwind `text-primary`; the parent
// element controls everything else (font weight, size, default color).

export function SplitColoredTitle({ title }: { title: string }) {
  const parts = title.trim().split(/\s+/)
  if (parts.length <= 1) {
    return <span className="text-primary">{title}</span>
  }
  const last = parts.pop()
  return (
    <>
      <span>{parts.join(' ')} </span>
      <span className="text-primary">{last}</span>
    </>
  )
}
