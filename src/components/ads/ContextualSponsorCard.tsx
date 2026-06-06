import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ClaimSpotButton } from '@/components/ClaimSpotButton'

interface Props {
  headline: string
  description: string
  ctaLabel?: string
  ctaUrl?: string
  advertiserName?: string
  context?: string   // 'education' | 'summer' | 'health' | etc.
  variant?: 'inline' | 'sidebar'
}

export function ContextualSponsorCard({
  headline,
  description,
  ctaLabel = 'Learn More',
  ctaUrl = '/advertise',
  advertiserName,
  variant = 'inline',
}: Props) {
  if (variant === 'sidebar') {
    return (
      <div className="border border-border/40 rounded-2xl overflow-hidden bg-card">
        <div className="px-4 py-2 bg-muted/50 border-b border-border/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Education Partner</p>
        </div>
        <div className="p-4">
          {advertiserName && (
            <p className="text-xs font-bold text-foreground mb-1">{advertiserName}</p>
          )}
          <p className="text-sm font-semibold text-foreground leading-snug mb-2">{headline}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
          <Link
            href={ctaUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            {ctaLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    )
  }

  // inline variant — horizontal card for between content sections
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="text-xl">🎓</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Education Partner</p>
        <p className="text-sm font-semibold text-foreground leading-snug">{headline}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description}</p>
      </div>
      <Link
        href={ctaUrl}
        className="shrink-0 px-3 py-1.5 border border-primary/30 text-primary text-xs font-bold rounded-full hover:bg-primary/10 transition-colors whitespace-nowrap"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

// Fallback "available" card shown when no real sponsor is booked.
// Intentionally understated so it doesn't feel like an ad, but compelling enough
// that advertisers who see it understand the opportunity.
export function SponsorPlaceholder({ context = 'education' }: { context?: string }) {
  const config: Record<string, { label: string; headline: string; desc: string; emoji: string }> = {
    education: {
      label:    'Education Partner',
      headline: 'Reach families searching for education resources',
      desc:     'One exclusive sponsor anchors this section. Tutoring, afterschool, enrichment, and school-related businesses.',
      emoji:    '🎓',
    },
    summer: {
      label:    'Summer Sponsor',
      headline: 'Be the go-to summer resource for River Region families',
      desc:     'Summer camps, swim lessons, day programs, and activities. First-come, first-served.',
      emoji:    '☀️',
    },
    health: {
      label:    'Health Partner',
      headline: 'Connect with families prioritizing their kids\' health',
      desc:     'Pediatric health, dental, counseling, and wellness services.',
      emoji:    '💙',
    },
    family: {
      label:    'Family Partner',
      headline: 'Put your business in front of River Region families',
      desc:     'Family services, home, real estate, and community businesses.',
      emoji:    '🏠',
    },
  }
  const c = config[context] ?? config.education

  return (
    <ClaimSpotButton
      as="a"
      href="/advertise"
      placementType="article_inline_recommendation"
      placementLabel={`${c.label} — ${c.headline}`}
      className="group w-full flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border border-dashed border-primary/25 bg-primary/3 hover:bg-primary/6 hover:border-primary/40 transition-all text-left"
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
          <span className="text-lg">{c.emoji}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{c.label} — Available</p>
          <p className="text-sm font-semibold text-foreground leading-snug mb-1">{c.headline}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center justify-center gap-1 px-4 py-2 bg-primary/10 border border-primary/25 text-primary text-xs font-bold rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors whitespace-nowrap self-start sm:self-center">
        Claim This Spot <ArrowRight className="h-3 w-3" />
      </span>
    </ClaimSpotButton>
  )
}
