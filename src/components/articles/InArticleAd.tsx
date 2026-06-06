import { Button } from '@/components/ui/button'

interface Props {
  headline:    string
  description: string
  ctaLabel:    string
  ctaUrl:      string
  /** Image-mode creative URL. When set + creativeMode='image', the ad
   *  renders as a full-bleed clickable image with no platform text. */
  imageUrl?:    string | null
  creativeMode?: 'composed' | 'image' | null
}

export function InArticleAd({ headline, description, ctaLabel, ctaUrl, imageUrl, creativeMode }: Props) {
  // Image mode (migration 125) — full-bleed advertiser-supplied creative.
  // No platform text added; the JPG/PNG IS the ad.
  if (creativeMode === 'image' && imageUrl) {
    return (
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block my-10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        aria-label={headline}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={headline} className="w-full h-auto object-cover" />
      </a>
    )
  }

  // Composed mode (default) — platform-formatted card.
  return (
    <div className="my-10 p-6 sm:p-8 bg-secondary/10 border border-secondary/20 rounded-2xl relative text-center overflow-hidden group">
      <span className="absolute top-3 right-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/80 px-2 py-1 rounded backdrop-blur z-10 border border-border/50">
        Advertisement
      </span>
      <div className="relative z-10 max-w-md mx-auto">
        <h3 className="text-2xl font-bold text-foreground mb-3 mt-4">{headline}</h3>
        <p className="mb-6 text-muted-foreground">{description}</p>
        <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">{ctaLabel}</a>
        </Button>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent group-hover:scale-105 transition-transform duration-700" />
    </div>
  )
}
