// ── /submit ───────────────────────────────────────────────────────────────────
// Community participation gateway. Grouped submission cards organized by purpose.
// Warm, friendly, trust-forward — not a corporate form directory.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { GATEWAY_GROUPS, SUBMISSION_TYPES, TYPE_COLORS } from '@/lib/submissions'

export const metadata: Metadata = {
  title: 'Submit — River Region Parents',
  description: 'Nominate a teacher, share school news, celebrate a birthday, submit an event, or be featured in River Region Parents. Easy community participation.',
}

export default function SubmitPage() {
  return (
    <main>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-border/40 bg-gradient-to-br from-primary/6 via-background to-secondary/4">
        <div className="container py-10 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3">
            <BookOpen className="h-3.5 w-3.5" />
            Community Participation
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight max-w-2xl mx-auto mb-4">
            Share Your Story With River Region Families
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Nominate a teacher. Celebrate a birthday. Share school news. Tell us about a local business
            you love. Our editorial team reads every submission.
          </p>
        </div>
      </section>

      {/* ── SUBMISSION GROUPS ──────────────────────────────────────────────── */}
      <section className="container py-12 md:py-16">

        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
            What would you like to submit?
          </p>
          <p className="text-base text-muted-foreground">
            Choose the type of submission that fits what you want to share.
          </p>
        </div>

        <div className="flex flex-col gap-12 max-w-6xl mx-auto">
          {GATEWAY_GROUPS.map(group => {
            const typesInGroup = SUBMISSION_TYPES.filter(t => t.groupSlug === group.slug)
            if (typesInGroup.length === 0) return null
            return (
              <div key={group.slug}>
                {/* Group header */}
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/40">
                  <span className="text-2xl" aria-hidden="true">{group.emoji}</span>
                  <div>
                    <h2 className="text-xl font-black text-foreground leading-snug">{group.label}</h2>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </div>

                {/* Type cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typesInGroup.map(sub => {
                    const accentColor = TYPE_COLORS[sub.type] ?? '#ed7434'
                    const href = sub.externalUrl ?? `/submit/${sub.type}`
                    return (
                      <Link
                        key={sub.type}
                        href={href}
                        className="group flex flex-col rounded-2xl border border-border/50 bg-white px-5 py-5 hover:border-foreground/20 hover:shadow-sm transition-all"
                        style={{ borderTopWidth: 4, borderTopColor: accentColor }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl" aria-hidden="true">{sub.emoji}</span>
                          <h3 className="text-base font-bold text-foreground leading-tight">{sub.label}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{sub.description}</p>

                        <div className="flex flex-col gap-1 mb-4 text-xs">
                          <div className="flex gap-1.5">
                            <span className="text-muted-foreground/70 shrink-0">Who:</span>
                            <span className="text-foreground/70 leading-snug">{sub.whoShouldUse}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="text-muted-foreground/70 shrink-0">Next:</span>
                            <span className="text-foreground/70 leading-snug">{sub.whatHappensNext}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <span className="text-muted-foreground/70 shrink-0">Time:</span>
                            <span className="text-foreground/70">About {sub.estimatedTime}</span>
                          </div>
                        </div>

                        <span
                          className="inline-flex items-center gap-1.5 self-start rounded-full text-white font-bold text-xs px-4 py-2 mt-auto group-hover:gap-2.5 transition-all"
                          style={{ backgroundColor: accentColor }}
                        >
                          {sub.externalUrl ? 'Go to nominations' : 'Begin'} <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── TRUST FOOTER ───────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-border/40">
        <div className="container max-w-2xl py-12 text-center">
          <p className="text-lg md:text-xl font-bold text-foreground italic mb-3">
            Every submission is read by our editorial team.
          </p>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5">
            We are a small, local editorial team — not a bot. When you submit something, a real
            person reads it. We may not feature everything, but we appreciate every submission
            from the River Region community.
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? Email{' '}
            <a href="mailto:hello@riverregionparents.com" className="font-semibold text-primary hover:text-primary/80">
              hello@riverregionparents.com
            </a>
          </p>
        </div>
      </section>
    </main>
  )
}
