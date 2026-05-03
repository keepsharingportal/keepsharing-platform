import { Button } from '@/components/ui/button'

interface Props {
  headline: string
  description: string
  ctaLabel: string
  ctaUrl: string
}

export function InArticleAd({ headline, description, ctaLabel, ctaUrl }: Props) {
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
