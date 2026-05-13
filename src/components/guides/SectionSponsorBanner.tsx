import Link from 'next/link'
import { ArrowRight, Crown, Zap } from 'lucide-react'

interface Props {
  guideName: string
  guideUrlSlug: string
}

export function SectionSponsorBanner({ guideName }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/18 via-accent/8 to-primary/8">
      {/* Subtle decorative glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center mt-0.5">
            <Crown className="h-4.5 w-4.5 text-accent" style={{ width: '1.125rem', height: '1.125rem' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-black uppercase tracking-widest text-accent">
                Exclusive Sponsorship Available
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                <Zap className="h-2.5 w-2.5" /> 1 Spot
              </span>
            </div>
            <p className="font-bold text-foreground leading-snug text-base">
              Own the {guideName} — be the only sponsor, every search
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
              Your business anchors every result River Region families see in this guide.
              One sponsor per guide, per year. First come, first served.
            </p>
          </div>
        </div>

        <Link
          href="/advertise"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
        >
          Claim This Spot <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
