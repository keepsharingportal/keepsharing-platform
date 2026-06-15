// Shared "By <Author>" span that links to /authors/[slug] when we can
// derive a slug from the name. Visible link mirrors the Person @id
// reference in NewsArticle JSON-LD — humans follow the link, crawlers
// follow the structured @id.

import Link from 'next/link'
import { authorNameToSlug } from '@/lib/seo/author-slug'

interface Props {
  authorName?: string | null
  /** "By" prefix when true (default). Set false to render just the name. */
  withPrefix?: boolean
  /** Optional className passthrough for the wrapping element. */
  className?:  string
}

export function AuthorByline({ authorName, withPrefix = true, className }: Props) {
  if (!authorName) return null
  const slug  = authorNameToSlug(authorName)
  const label = withPrefix ? <>By {authorName}</> : <>{authorName}</>
  if (!slug) return <span className={className}>{label}</span>
  return (
    <Link href={`/authors/${slug}`} className={className} style={{ textDecoration: 'none' }}>
      {label}
    </Link>
  )
}
