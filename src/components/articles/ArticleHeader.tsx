import Link from 'next/link'

interface Props {
  category:        string                          // primary section, e.g. "Mom to Mom"
  categoryHref?:   string
  badgeClassName?: string                          // solid color classes from columnBadgeStyle()
  title:           string
}

export function ArticleHeader({ category, categoryHref, badgeClassName, title }: Props) {
  // Default falls back to the primary coral if the caller didn't pass column-specific classes.
  const badgeCls = badgeClassName ?? 'bg-primary text-primary-foreground'

  const badge = (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeCls}`}>
      {category}
    </span>
  )

  return (
    <>
      <div className="mb-4">
        {categoryHref ? (
          <Link href={categoryHref} className="hover:opacity-90 transition-opacity">{badge}</Link>
        ) : badge}
      </div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight text-foreground">
        {title}
      </h1>
    </>
  )
}
