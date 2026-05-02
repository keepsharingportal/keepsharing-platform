interface Props {
  hasMilitaryDiscount?: boolean | null
  isVeteranOwned?:      boolean | null
  isWomanOwned?:        boolean | null
  isMinorityOwned?:     boolean | null
  isLocallyOwned?:      boolean | null
  className?: string
}

const BADGE_CONFIG: Array<{
  key: keyof Omit<Props, 'className'>
  emoji: string
  label: string
  bgClass: string
  textClass: string
}> = [
  { key: 'hasMilitaryDiscount', emoji: '🎖️', label: 'Military discount', bgClass: 'bg-emerald-50', textClass: 'text-emerald-800 border-emerald-200' },
  { key: 'isVeteranOwned',      emoji: '🇺🇸', label: 'Veteran-owned',    bgClass: 'bg-blue-50',    textClass: 'text-blue-800 border-blue-200' },
  { key: 'isWomanOwned',        emoji: '✨',  label: 'Woman-owned',       bgClass: 'bg-rose-50',    textClass: 'text-rose-800 border-rose-200' },
  { key: 'isMinorityOwned',     emoji: '🌟', label: 'Minority-owned',    bgClass: 'bg-amber-50',   textClass: 'text-amber-800 border-amber-200' },
  { key: 'isLocallyOwned',      emoji: '🏡', label: 'Locally owned',     bgClass: 'bg-teal-50',    textClass: 'text-teal-800 border-teal-200' },
]

export function ListingBadges(props: Props) {
  const active = BADGE_CONFIG.filter(b => props[b.key])
  if (active.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${props.className ?? ''}`}>
      {active.map(b => (
        <span
          key={b.key}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${b.bgClass} ${b.textClass}`}
        >
          <span>{b.emoji}</span>{b.label}
        </span>
      ))}
    </div>
  )
}
