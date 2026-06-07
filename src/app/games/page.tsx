// ── /games ────────────────────────────────────────────────────────────────────
// Brain Games hub. Lists the 6 games + difficulty selector + live ticker of
// real recent scores + sponsorship slot + prize info. Content auto-rotates
// every ISO week.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import {
  Gift, Sparkles, ChevronRight, Trophy,
  Brain, Puzzle, Timer, Smile, Calculator, Grid3x3,
} from 'lucide-react'
import { HeroSponsorCard } from '@/components/verticals/HeroSponsorCard'
import { getActiveAds } from '@/lib/get-active-ads'
import { GAMES, DIFFICULTIES, DEFAULT_DIFFICULTY, type Difficulty, type GameId } from '@/lib/games/types'
import { isoWeekString } from '@/lib/games/weekly'
import { DifficultyChooser } from './DifficultyChooser'
import { createClient } from '@supabase/supabase-js'

export const metadata: Metadata = {
  title:       'Family Brain Games — River Region Parents',
  description: 'New brain games every day. Play, submit your score, and win one of three $10 prizes every week.',
}
export const revalidate = 900

function isValidDifficulty(s: string | undefined): s is Difficulty {
  return DIFFICULTIES.includes(s as Difficulty)
}

interface TickerRow {
  first_name: string
  last_initial: string
  game_type:  string
  score:      number
  created_at: string
}

interface LastWeekWinner {
  slot:         number
  first_name:   string
  last_initial: string
}

interface LastWeekWinners {
  week_iso:     string
  week_label:   string
  winners:      LastWeekWinner[]
}

// Returns the most recent ISO week that has at least one recorded winner
// (excludes the *current* week, since we want "last week's results").
async function lastWeeksWinners(): Promise<LastWeekWinners | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  // Probe — fail gracefully if migrations 082/083 aren't applied yet.
  const probe = await supabase.from('game_winners').select('id').limit(1)
  if (probe.error) return null

  const currentWeek = isoWeekString()
  const { data } = await supabase
    .from('game_winners')
    .select('slot, first_name, last_initial, week_iso')
    .eq('market', 'rrp')
    .not('week_iso', 'is', null)
    .neq('week_iso', currentWeek)
    .order('week_iso', { ascending: false })
    .order('slot', { ascending: true })
    .limit(10)
  if (!data || data.length === 0) return null

  const rows = data as { slot: number; first_name: string; last_initial: string | null; week_iso: string }[]
  // Group by the most-recent week_iso
  const mostRecent = rows[0].week_iso
  const winners = rows
    .filter(r => r.week_iso === mostRecent)
    .map(r => ({
      slot:         r.slot,
      first_name:   r.first_name,
      last_initial: (r.last_initial ?? '').toUpperCase(),
    }))
  return {
    week_iso:   mostRecent,
    week_label: humanizeWeekIso(mostRecent),
    winners,
  }
}

function humanizeWeekIso(weekIso: string): string {
  // "2026-W21" → "Week 21"
  const m = weekIso.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return weekIso
  return `Week ${parseInt(m[2], 10)}`
}

async function recentScores(): Promise<TickerRow[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data, error } = await supabase
    .from('game_scores')
    .select('first_name, last_name, game_type, score, created_at')
    .order('created_at', { ascending: false })
    .limit(12)
  if (error || !data) return []
  return data.map(r => {
    const row = r as { first_name: string; last_name: string; game_type: string; score: number; created_at: string }
    return {
      first_name:   row.first_name,
      last_initial: (row.last_name?.[0] ?? '').toUpperCase(),
      game_type:    row.game_type,
      score:        row.score,
      created_at:   row.created_at,
    }
  })
}

// Lucide icon + color pairing per game. Stays in the page (not types.ts)
// since types.ts is shared with non-UI code (announce-render, etc.) and
// shouldn't pull in React components.
const GAME_ICONS: Record<GameId, { Icon: React.ElementType; bg: string; fg: string; ring: string }> = {
  'family-connect': { Icon: Puzzle,     bg: 'bg-primary/10',    fg: 'text-primary',          ring: 'border-primary/20'    },
  'trivia':         { Icon: Sparkles,   bg: 'bg-secondary/10',  fg: 'text-secondary',        ring: 'border-secondary/20'  },
  'scramble':       { Icon: Grid3x3,    bg: 'bg-accent/15',     fg: 'text-accent-foreground', ring: 'border-accent/30'     },
  'memory':         { Icon: Timer,      bg: 'bg-foreground/8',  fg: 'text-foreground',       ring: 'border-foreground/15' },
  'emoji':          { Icon: Smile,      bg: 'bg-primary/10',    fg: 'text-primary',          ring: 'border-primary/20'    },
  'math':           { Icon: Calculator, bg: 'bg-secondary/10',  fg: 'text-secondary',        ring: 'border-secondary/20'  },
  'word-search':    { Icon: Brain,      bg: 'bg-primary/10',    fg: 'text-primary',          ring: 'border-primary/20'    },
}

// Seed ticker content shown until real plays start logging. Mixed in with
// any real recent scores so the ticker always has something to scroll.
const SEED_TICKER: string[] = [
  '🎉 New brain games every morning',
  '💵 3 winners every week — $10 each',
  '🧠 Every game played = one more entry',
  '👋 Be one of the first to play today',
  '✨ Share your score for the daily brag',
]

interface PageProps {
  searchParams: Promise<{ diff?: string }>
}

export default async function GamesHubPage({ searchParams }: PageProps) {
  const sp         = await searchParams
  const difficulty: Difficulty = isValidDifficulty(sp.diff) ? sp.diff : DEFAULT_DIFFICULTY
  // (week label was rendered in the hero — copy was redundant with the
  // subhead and got pruned. isoWeek() can come back when we add another
  // copy block that genuinely needs it.)

  const ticker     = await recentScores()
  const tickerItems: string[] = ticker.length > 0
    ? ticker.map(s => `🏆 ${s.first_name} ${s.last_initial}. scored ${s.score} on ${humanizeGame(s.game_type)}`)
    : SEED_TICKER
  const lastWeek = await lastWeeksWinners()

  // Sponsor lookup — same system as School Zone + Calendar. When a sponsor
  // is booked via /admin/ads (placement_type='section_sponsor',
  // context_slug='games'), it replaces the hardcoded "Brainy Kids Academy".
  const sponsorAds = await getActiveAds('section_sponsor', 'games', 1)
  const gamesSponsor = sponsorAds[0]?.advertiser_name
    ? {
        businessName: sponsorAds[0].advertiser_name,
        slug:         sponsorAds[0].advertiser_slug ?? null,
        headline:     sponsorAds[0].ad_headline ?? null,
        // Extra fields powering the YMCA-inline-ad layout.
        imageUrl:     sponsorAds[0].ad_image_url ?? null,
        description:  sponsorAds[0].ad_description ?? null,
        ctaLabel:     sponsorAds[0].ad_cta_label ?? null,
        link:         sponsorAds[0].ad_link ?? null,
        placementId:  sponsorAds[0].id,
      }
    : null

  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      {/* HERO — warm cream-tan bg with subtle dot pattern */}
      <section className="relative overflow-hidden border-b border-border/40 bg-muted">
        <div
          className="absolute inset-0 opacity-[0.10] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-foreground) 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="container relative z-10 py-12 md:py-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-foreground mb-4 leading-[1.05]">Family Brain Games</h1>
          <p className="text-lg md:text-xl text-foreground/80 max-w-xl mx-auto mb-6 leading-snug">
            Quick puzzles. Three $10 winners every Monday.
          </p>

          {/* Winners pill — only renders when last week actually has
              winners. The placeholder 'first drawing coming Monday'
              version got dropped because it repeats the subhead and
              adds visual noise without telling the player anything
              they don't already know. */}
          {lastWeek && lastWeek.winners.length > 0 && (
            <div className="inline-flex items-center gap-2 mb-8 rounded-full bg-background/80 border border-primary/30 px-4 py-2 shadow-sm max-w-full">
              <Trophy className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                Last week&apos;s $10 winners:&nbsp;
                <strong className="text-primary">
                  {lastWeek.winners
                    .sort((a, b) => a.slot - b.slot)
                    .map(w => `${w.first_name} ${w.last_initial}.`)
                    .join(', ')}
                </strong>
                {' '}<span className="text-muted-foreground font-normal">({lastWeek.week_label})</span>
              </span>
            </div>
          )}

          {/* Sponsor — YMCA-inline-ad layout, with a small label
              above the box. Reads from ad_placements via
              getActiveAds; placeholder when nothing is booked. */}
          <HeroSponsorCard
            sponsor={gamesSponsor}
            aboveLabel="Family Brain Games Are Sponsored By"
            verticalSlug="games"
            placeholderName="Your Business Here"
            placeholderTagline="Sponsor Family Brain Games — your business anchors every game page River Region families play."
            placeholderCtaLabel="Claim This Spot"
          />
        </div>
      </section>

      <main className="container py-12 space-y-12">

        {/* LIVE TICKER — always shows. Real scores when available, seeds otherwise. */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl py-3 overflow-hidden">
          <div className="flex gap-10 whitespace-nowrap animate-[marquee_30s_linear_infinite] text-sm font-bold text-primary">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-2 shrink-0">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* DIFFICULTY SELECTOR
            Anchor id="pick-level" — the post-game 'Take me back to games'
            CTA uses /games?diff=...#pick-level so returning players land
            right at the chooser instead of scrolling past the hero. */}
        <div id="pick-level" className="scroll-mt-16 md:scroll-mt-20">
          <DifficultyChooser current={difficulty} />
        </div>

        {/* GAMES GRID — large icon-box cards matching the original AI Studio reference */}
        <section className="grid md:grid-cols-2 gap-5">
          {GAMES.map(g => {
            const meta  = GAME_ICONS[g.id] ?? GAME_ICONS['family-connect']
            const Icon  = meta.Icon
            return (
              <Link
                key={g.id}
                href={`/games/${g.id}?diff=${difficulty}`}
                className={`group block rounded-3xl border-2 ${meta.ring} bg-card hover:shadow-lg transition-all`}
              >
                <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.fg} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">{g.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{g.desc}</p>
                    <span className="inline-flex items-center mt-4 text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      Play Now <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        {/* SPONSORED AD SLOT — placeholder until tied into ad_placements */}
        <div className="relative bg-gradient-to-r from-primary/10 to-secondary/10 border border-border/50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 group transition-colors hover:border-primary/30">
          <span className="absolute top-4 right-6 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Advertisement</span>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold text-foreground mb-2">Escape Room Montgomery</h3>
            <p className="text-muted-foreground leading-relaxed">
              Love puzzles? Bring the whole family for a real-life challenge. Book today and get 15% off with code <strong className="text-foreground">PARENT15</strong>.
            </p>
          </div>
          <a
            href="#"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-bold text-sm px-6 py-3 hover:bg-primary/90 transition-colors"
          >
            Book Now <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* PRIZE INFO */}
        <section className="bg-card border border-border/50 rounded-3xl px-6 py-12 md:px-12 md:py-14 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Gift className="h-7 w-7" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">3 Winners. $10 Each. Every Week.</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Play any of our brain games, complete the challenge, and submit your score.
            Every completion = one entry into Monday&apos;s drawing.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            {[
              { n: '01', label: 'Play Daily',     desc: 'New puzzles every morning. Stack up entries all week long.' },
              { n: '02', label: 'Beat the Level', desc: 'Find the connections, answer the trivia, beat the timer.' },
              { n: '03', label: 'Win Monday',     desc: '3 random winners drawn every Monday — each gets $10 Venmo or PayPal.' },
            ].map(step => (
              <div key={step.n} className="bg-muted/50 rounded-2xl p-6">
                <p className="text-3xl font-black text-primary/30 mb-2">{step.n}</p>
                <p className="font-bold text-foreground mb-2">{step.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTNOTE — daily rotation explainer */}
        <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
          Games refresh every morning at midnight Central time. Same puzzles for everyone playing today — bragging rights are honest.
          <Link href={`/games/family-connect?diff=${difficulty}`} className="ml-2 text-primary hover:underline font-semibold">Jump in →</Link>
        </p>
      </main>

      <PublicFooter />

      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  )
}

function humanizeGame(slug: string): string {
  return GAMES.find(g => g.id === slug)?.title ?? slug
}
