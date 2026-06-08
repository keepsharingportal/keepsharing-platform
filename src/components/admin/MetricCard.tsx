// ── src/components/admin/MetricCard.tsx ──────────────────────────────────────
// Shared metric display tile used across admin dashboards.
// Supports light (white card) and dark (translucent on navy) variants.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'

interface MetricCardProps {
  label:    string
  value:    number | string
  sub?:     string
  color?:   string          // hex text color for the value
  href?:    string          // optional — wraps card in a Link
  variant?: 'light' | 'dark'
}

export function MetricCard({
  label, value, sub, color = '#374151', href, variant = 'light',
}: MetricCardProps) {
  const content = variant === 'dark' ? (
    <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-white/70 text-[11px] font-semibold mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-white/30 text-[10px] mt-0.5">{sub}</p>}
    </div>
  ) : (
    <div className="bg-white border border-portal-border rounded-xl px-4 py-3 hover:border-portal-border hover:shadow-sm transition-all">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs font-semibold text-portal-sub mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-portal-muted mt-0.5">{sub}</p>}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return content
}
