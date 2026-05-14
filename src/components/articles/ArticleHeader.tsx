import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock } from 'lucide-react'
import Link from 'next/link'

interface Props {
  category:        string                          // primary section, e.g. "School Zone"
  categoryHref?:   string
  subCategory?:    string | null                   // column/type, e.g. "School Bits"
  subCategoryHref?: string | null
  publishedDate:   string
  readTimeMinutes: number
  title:           string
}

export function ArticleHeader({
  category, categoryHref, subCategory, subCategoryHref,
  publishedDate, readTimeMinutes, title,
}: Props) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {categoryHref ? (
            <Link href={categoryHref}>
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-3 py-1 cursor-pointer">
                {category}
              </Badge>
            </Link>
          ) : (
            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
              {category}
            </Badge>
          )}
          {subCategory && (
            subCategoryHref ? (
              <Link href={subCategoryHref}>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer">
                  {subCategory}
                </Badge>
              </Link>
            ) : (
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 text-primary">
                {subCategory}
              </Badge>
            )
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
          <CalendarDays className="h-4 w-4" />
          <span>{publishedDate}</span>
          <span className="mx-1">·</span>
          <Clock className="h-4 w-4" />
          <span>{readTimeMinutes} min read</span>
        </div>
      </div>
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight text-foreground">
        {title}
      </h1>
    </>
  )
}
