// Homepage promo band for Family Brain Games.
//
// Until now /games was reachable only from the top nav, and the homepage —
// by far the highest-traffic page — said nothing about it. Total participation
// since launch is 5 plays from 4 people, so the page was never really given a
// front door.
//
// Prize copy comes from lib/games/prize.ts, NOT hardcoded here. That file is
// the single source of truth so changing the drawing (e.g. 3 x $10 weekly to
// 1 x $25 weekly) updates the hub, the win screen, the admin, and this band
// together.
//
// Deliberately a server component with no DB query: this sits mid-homepage and
// shouldn't add latency. The live ticker and winners pill live on /games where
// they have room to breathe.

import Link from 'next/link'
import { ArrowRight, Sparkles, Trophy } from 'lucide-react'
import { GAMES } from '@/lib/games/types'
import { prizeHeadline, prizeShortLine } from '@/lib/games/prize'

export function GamesPromoBlock() {
  return (
    <section>
      <Link
        href="/games"
        className="group block w-full rounded-3xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all"
      >
        <div className="flex flex-col md:flex-row items-stretch">
          {/* Offer side */}
          <div className="flex-1 p-6 md:p-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-secondary-foreground bg-secondary rounded-full px-2.5 py-1 mb-3">
              <Sparkles className="h-3 w-3" />
              Daily Challenge
            </span>

            <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
              Family Brain Games
            </h3>

            {/* The offer, stated plainly — this is the reason to click. */}
            <p className="text-base md:text-lg font-bold text-foreground/85 leading-snug mb-2">
              {prizeHeadline()}.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-md">
              Six quick games, fresh puzzles every morning, and every game you
              finish is one more entry in the drawing. Most take under five minutes.
            </p>

            <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold group-hover:bg-primary/90 transition-colors shadow-sm">
              Play Today&apos;s Games <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          {/* Game list side. Hidden below md — on a phone the offer and CTA
              matter far more than a game inventory, and this would push the
              button below the fold. */}
          <div className="hidden md:flex md:w-[300px] lg:w-[340px] shrink-0 flex-col justify-center gap-2 p-8 bg-primary/5 border-l border-border/50">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              <Trophy className="h-3 w-3" />
              {prizeShortLine()}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GAMES.map(g => (
                <span
                  key={g.id}
                  className="text-xs font-semibold text-foreground/80 bg-background border border-border/60 rounded-full px-2.5 py-1"
                >
                  {g.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
