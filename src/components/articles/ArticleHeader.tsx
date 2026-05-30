import Link from 'next/link'

interface Props {
  category?:       string                          // primary section, e.g. "Mom to Mom". Omit to hide the badge entirely (used by Play Ball Spotlight which renders its own eyebrow above).
  categoryHref?:   string
  badgeClassName?: string                          // solid color classes from columnBadgeStyle()
  title:           string
  /**
   * Magazine-style deck / lead paragraph shown directly under the title.
   * Distinct from `excerpt` (the card hook for listings). Saved to the
   * `subtitle` column on guide_articles. Leave empty for articles that
   * don't need a lead.
   */
  subtitle?:       string | null
}

export function ArticleHeader({ category, categoryHref, badgeClassName, title, subtitle }: Props) {
  // Default falls back to the primary coral if the caller didn't pass column-specific classes.
  const badgeCls = badgeClassName ?? 'bg-primary text-primary-foreground'

  const badge = (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeCls}`}>
      {category}
    </span>
  )

  return (
    <>
      {category && (
        <div className="mb-4">
          {categoryHref ? (
            <Link href={categoryHref} className="hover:opacity-90 transition-opacity">{badge}</Link>
          ) : badge}
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-foreground">
        {title}
      </h1>
      {subtitle?.trim() && (
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6 md:mb-8 max-w-3xl">
          {subtitle}
        </p>
      )}
    </>
  )
}
