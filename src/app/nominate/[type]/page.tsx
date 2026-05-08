import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Trophy, Heart, Users, Sparkles, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/theme'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Nominate Someone | River Region Parents',
  description: 'Nominate a teacher, student athlete, grandparent, or community hero for monthly recognition in River Region Parents.',
}

const NOMINATIONS = [
  {
    id:    'teacher',
    title: 'Teacher of the Month',
    desc:  'Recognize an outstanding educator who has made a difference in your child\'s life. We celebrate one teacher each month from across the River Region.',
    icon:  GraduationCap,
    accent: 'primary',
    formUrl: 'https://forms.gohighlevel.com/teacher-nomination', // placeholder — wire to GHL form
    eligibility: 'Currently teaching K-12 in the River Region',
  },
  {
    id:    'play-ball',
    title: 'Play Ball Spotlight',
    desc:  'Nominate a young athlete or coach making waves in local sports. We highlight one player or coach each month.',
    icon:  Trophy,
    accent: 'secondary',
    formUrl: 'https://forms.gohighlevel.com/play-ball-nomination',
    eligibility: 'Youth athletes (ages 5-18) or coaches in River Region leagues',
  },
  {
    id:    'grands',
    title: 'Grands are the Greatest',
    desc:  'Honor a grandparent whose love and presence have shaped your family. We feature one grandparent or grandparent couple each month.',
    icon:  Heart,
    accent: 'accent',
    formUrl: 'https://forms.gohighlevel.com/grands-nomination',
    eligibility: 'Grandparents living in or with strong ties to the River Region',
  },
  {
    id:    'community',
    title: 'Community Hero',
    desc:  'Know someone making the River Region a better place to raise a family? Nominate them for our Community Hero spotlight.',
    icon:  Users,
    accent: 'primary',
    formUrl: 'https://forms.gohighlevel.com/community-hero-nomination',
    eligibility: 'Anyone making a positive impact on River Region families',
  },
]

const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  primary:   { bg: 'bg-primary/5',   border: 'border-primary/20',   text: 'text-primary',   icon: 'text-primary' },
  secondary: { bg: 'bg-secondary/5', border: 'border-secondary/20', text: 'text-secondary', icon: 'text-secondary' },
  accent:    { bg: 'bg-accent/10',   border: 'border-accent/30',    text: 'text-accent-foreground', icon: 'text-accent-foreground' },
}

export default function NominatePage() {
  return (
    <div className="min-h-screen bg-background public-page">
      <Navigation />

      <PageHeader
        title="Nominate Someone Special"
        subtitle="Every month we celebrate the teachers, athletes, grandparents, and community heroes who make the River Region an extraordinary place to raise a family. Nominations are open year-round."
        badge={{ text: 'Community Recognition', variant: 'secondary' }}
        variant="cream"
        align="center"
        withBlur={true}
      />

      <main className="container py-12 space-y-12">

        {/* Nomination categories */}
        <section>
          <div className="grid md:grid-cols-2 gap-6">
            {NOMINATIONS.map(nom => {
              const colors = ACCENT_CLASSES[nom.accent]
              const Icon = nom.icon
              return (
                <Card key={nom.id} className={`${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}>
                  <CardHeader>
                    <div className="flex items-start gap-4 mb-2">
                      <div className={`w-14 h-14 rounded-2xl bg-background shadow-sm flex items-center justify-center shrink-0`}>
                        <Icon className={`h-7 w-7 ${colors.icon}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{nom.title}</CardTitle>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                          Monthly Spotlight
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed mb-4">{nom.desc}</p>
                    <p className="text-xs text-muted-foreground mb-6">
                      <strong className="text-foreground">Eligibility:</strong> {nom.eligibility}
                    </p>
                    <Button asChild className="w-full rounded-full">
                      <a href={nom.formUrl} target="_blank" rel="noopener noreferrer">
                        Submit Nomination <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-card border border-border/50 rounded-3xl p-8 md:p-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">How Nominations Work</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-3">1</div>
              <h3 className="font-bold mb-2">Submit Your Nomination</h3>
              <p className="text-sm text-muted-foreground">Fill out the form for the category. Tell us why this person deserves recognition.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-3">2</div>
              <h3 className="font-bold mb-2">Editorial Review</h3>
              <p className="text-sm text-muted-foreground">Our editors review nominations each month and select honorees based on impact and community feedback.</p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-3">3</div>
              <h3 className="font-bold mb-2">Recognition</h3>
              <p className="text-sm text-muted-foreground">Selected honorees are featured on our homepage, in the print magazine, and across our social channels.</p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center bg-primary/5 border border-primary/20 rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-2">Want to be a Mom-to-Mom interview?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Our Mom-to-Mom column features local moms each month. If you have a story to share or know someone who does, we&apos;d love to hear from you.
          </p>
          <Button asChild className="rounded-full">
            <Link href="/columns/mom-to-mom">Learn About Mom to Mom →</Link>
          </Button>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}