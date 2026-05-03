import { Badge } from '@/components/ui/badge'

interface Props {
  value: string
  pillThreshold?: number
}

/**
 * Renders a guide_data field value intelligently:
 * - Colon-separated "Label: item1, item2" → bolded label + pills
 * - Plain comma-separated list of 4+ items → pills
 * - Short value → plain text
 */
export function StructuredFieldValue({ value, pillThreshold = 4 }: Props) {
  if (!value || typeof value !== 'string') return null

  const colonMatch = value.match(/^([^:]+):\s*(.+)$/)
  if (colonMatch) {
    const [, label, items] = colonMatch
    const parts = items.split(/,\s*/).map(s => s.trim()).filter(Boolean)
    if (parts.length >= pillThreshold) {
      return (
        <div className="space-y-2">
          <p className="font-semibold text-foreground text-sm">{label}</p>
          <div className="flex flex-wrap gap-1.5">
            {parts.map((p, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      )
    }
  }

  const parts = value.split(/,\s*/).map(s => s.trim()).filter(Boolean)
  if (parts.length >= pillThreshold) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {parts.map((p, i) => (
          <Badge key={i} variant="outline" className="text-xs font-normal">
            {p}
          </Badge>
        ))}
      </div>
    )
  }

  return <p className="text-sm text-foreground leading-relaxed">{value}</p>
}
