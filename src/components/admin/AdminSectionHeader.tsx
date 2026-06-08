// ── src/components/admin/AdminSectionHeader.tsx ───────────────────────────────
// Shared section divider used across admin dashboards.
// Displays a title with optional count badge and description,
// separated from the content below by a horizontal rule.
// ─────────────────────────────────────────────────────────────────────────────

interface AdminSectionHeaderProps {
  title:        string
  count?:       number   // shown as "(n)" after the title
  description?: string   // shown right-aligned, hidden on mobile
  className?:   string
}

export function AdminSectionHeader({
  title, count, description, className = '',
}: AdminSectionHeaderProps) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <h2 className="text-sm font-bold text-portal-text shrink-0">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-portal-muted font-normal">({count})</span>
        )}
      </h2>
      <div className="flex-1 h-px bg-gray-100" />
      {description && (
        <p className="text-xs text-portal-muted shrink-0 hidden sm:block">{description}</p>
      )}
    </div>
  )
}
