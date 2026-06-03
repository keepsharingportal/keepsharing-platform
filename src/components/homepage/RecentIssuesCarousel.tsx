// Recent Issues — horizontally scrollable strip of past digital editions.
// Inspired by KC Parent's layout: cover thumb, month label, click opens
// the Issuu flipbook in a new tab.
//
// Renders as a flex row with overflow-x-auto so it works mobile-first
// (swipe to scroll) and grows into a clean grid on larger screens. We use
// a server component for the cards but the chevron buttons are progressive
// enhancement only — scroll works without JS.

import Image from 'next/image'
import { BookOpen, ExternalLink } from 'lucide-react'

export interface RecentIssue {
  id:           string
  label:        string
  tagline:      string | null
  issue_month:  string
  cover_url:    string | null
  issuu_url:    string
}

interface Props {
  issues: RecentIssue[]
}

function monthLabel(d: string): string {
  if (!d) return ''
  const dt = new Date(d.slice(0, 10) + 'T12:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function RecentIssuesCarousel({ issues }: Props) {
  if (!issues.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Recent Issues
        </h2>
        <span className="text-xs text-muted-foreground">Read past editions</span>
      </div>

      <div
        className="flex gap-4 md:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {issues.map(issue => (
          <a
            key={issue.id}
            href={issue.issuu_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 snap-start w-[140px] md:w-[160px] flex flex-col"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted shadow-sm group-hover:shadow-md transition-shadow">
              {issue.cover_url ? (
                <Image
                  src={issue.cover_url}
                  alt={`${issue.label} cover`}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                  sizes="160px"
                  className="group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                  {issue.label}
                </div>
              )}
              <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-foreground" />
              </div>
            </div>
            <p className="mt-2 text-xs md:text-sm font-bold text-foreground leading-tight line-clamp-1">{issue.label}</p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              {monthLabel(issue.issue_month)}
            </p>
          </a>
        ))}
      </div>
    </section>
  )
}
