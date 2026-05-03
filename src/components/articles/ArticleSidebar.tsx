import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NewsletterSignup } from '@/components/NewsletterSignup'

interface TrendingItem {
  id: string
  title: string
  slug: string
  hero_image_url: string | null
  date_label: string
  href: string
}

interface AdPlacement {
  id: string
  headline: string
  description: string
  cta_label: string
  cta_url: string
  advertiser_name: string
}

interface Props {
  stickyAd?: AdPlacement | null
  sponsoredAd?: AdPlacement | null
  trending: TrendingItem[]
}

export function ArticleSidebar({ stickyAd, sponsoredAd, trending }: Props) {
  return (
    <aside className="lg:col-span-4 space-y-8">
      {/* Sticky Sidebar Ad */}
      {stickyAd && (
        <Card className="bg-muted/30 border-border/50 shadow-sm text-center overflow-hidden">
          <CardContent className="p-8">
            <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">Ad</span>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">
                {(() => {
                  const name = stickyAd.advertiser_name.toLowerCase()
                  if (name.includes('dent')) return '🦷'
                  if (name.includes('school') || name.includes('academy')) return '🎓'
                  if (name.includes('camp')) return '⛺'
                  return '📰'
                })()}
              </span>
            </div>
            <h4 className="font-bold text-xl mb-3 text-foreground">{stickyAd.advertiser_name}</h4>
            <p className="text-sm text-muted-foreground mb-6">{stickyAd.description}</p>
            <Button asChild className="w-full shadow-sm">
              <a href={stickyAd.cta_url} target="_blank" rel="noopener noreferrer">{stickyAd.cta_label}</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Newsletter — primary color card */}
      <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <CardContent className="p-8 relative z-10">
          <h3 className="text-2xl font-bold mb-3">Get the Weekly Scoop!</h3>
          <p className="text-primary-foreground/90 text-sm mb-6 leading-relaxed">
            The best local events, weekend plans, and parenting tips — every Thursday morning.
          </p>
          <NewsletterSignup variant="inline" source="article-sidebar" />
        </CardContent>
      </Card>

      {/* Trending */}
      {trending.length > 0 && (
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            Trending Now
          </h3>
          <div className="space-y-5 divide-y divide-border/50">
            {trending.map((post, i) => (
              <Link href={post.href} key={post.id} className={`flex gap-4 group ${i > 0 ? 'pt-5' : ''}`}>
                {post.hero_image_url && (
                  <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                    <Image src={post.hero_image_url} alt={post.title} fill style={{ objectFit: 'cover' }} sizes="96px" unoptimized />
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-3 leading-snug text-foreground">
                    {post.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{post.date_label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sponsored CTA */}
      {sponsoredAd && (
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8 text-center relative shadow-sm">
          <span className="absolute top-3 right-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/80 px-2 py-1 rounded backdrop-blur border border-border/50">
            Sponsored
          </span>
          <h4 className="font-bold text-xl text-foreground mb-3 mt-4">{sponsoredAd.headline}</h4>
          <p className="text-sm text-muted-foreground mb-6">{sponsoredAd.description}</p>
          <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm font-bold">
            <a href={sponsoredAd.cta_url} target="_blank" rel="noopener noreferrer">{sponsoredAd.cta_label}</a>
          </Button>
        </div>
      )}
    </aside>
  )
}
