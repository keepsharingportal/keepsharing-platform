import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { PublicFooter } from '@/components/PublicFooter'
import { GraduationCap, Trophy, Heart, Users, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Nominate Someone — River Region Parents',
  description: 'Nominate a teacher, student athlete, grandparent, or community member for monthly recognition in River Region Parents.',
}

const CATEGORIES = [
  {
    href:        '/submit/teacher-of-the-month',
    icon:        GraduationCap,
    color:       'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:border-primary/40',
    iconBg:      'bg-primary/15',
    label:       'Teacher of the Month',
    description: 'Recognize an outstanding River Region educator who has made a real difference in your child\'s life.',
    cta:         'Nominate a Teacher',
    detail:      'Published monthly · All K-12 River Region schools',
  },
  {
    href:        '/submit/play-ball',
    icon:        Trophy,
    color:       'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/15 hover:border-secondary/40',
    iconBg:      'bg-secondary/15',
    label:       'Play Ball Spotlight',
    description: 'Nominate an athlete, coach, or team volunteer (team mom, booster club, concessions) who shows heart in local youth sports.',
    cta:         'Nominate an Athlete, Coach, or Volunteer',
    detail:      'Published monthly · Players, coaches, and team volunteers',
  },
  {
    href:        '/submit/grands-are-the-greatest',
    icon:        Heart,
    color:       'bg-accent/10 text-accent-foreground border-accent/20 hover:bg-accent/15 hover:border-accent/30',
    iconBg:      'bg-accent/15',
    label:       'Grands are the Greatest',
    description: 'Honor a grandparent whose love and presence have shaped your family in unforgettable ways.',
    cta:         'Nominate a Grandparent',
    detail:      'Published monthly · Open to all River Region families',
  },
  {
    href:        '/submit/mom-to-mom',
    icon:        Users,
    color:       'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
    iconBg:      'bg-rose-100',
    label:       'Mom Spotlight',
    description: 'Share the story of a mom in your life who is showing up, making it work, and inspiring her community.',
    cta:         'Nominate a Mom',
    detail:      'Published monthly · River Region families',
  },
]

export default function NominateLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <div className="border-b border-border/40 bg-gradient-to-br from-primary/6 via-background to-secondary/4">
        <div className="container py-10 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3">
              <GraduationCap className="h-3.5 w-3.5" />
              Community Recognition
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight mb-3">
              Nominate Someone Amazing
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
              Every month we celebrate the teachers, athletes, grandparents, and moms who make the River Region a great place to grow up. Know someone who deserves recognition? Tell us about them.
            </p>
          </div>
        </div>
      </div>

      <main className="container py-10 md:py-14">
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.href}
                href={cat.href}
                className={`group flex flex-col gap-4 p-6 rounded-2xl border-2 transition-all duration-200 ${cat.color}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg leading-snug mb-1.5">{cat.label}</h2>
                  <p className="text-sm leading-relaxed opacity-80">{cat.description}</p>
                  <p className="text-xs font-medium opacity-60 mt-2">{cat.detail}</p>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-bold mt-auto group-hover:gap-2.5 transition-all">
                  {cat.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            )
          })}
        </div>

        {/* How it works */}
        <div className="mt-14 max-w-2xl">
          <h2 className="text-xl font-bold text-foreground mb-5">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Submit your nomination',        body: 'Fill out the short form. Tell us why this person deserves recognition. It takes less than 5 minutes.' },
              { step: '2', title: 'Our editors review',            body: 'We read every nomination and select honorees that represent the heart of the River Region community.' },
              { step: '3', title: 'We publish their story',        body: 'Honorees are featured in River Region Parents print and digital issues, reaching thousands of local families.' },
              { step: '4', title: 'Share the celebration',         body: 'We\'ll notify you when the story is live so you can share it with family, friends, and the community.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{s.step}</div>
                <div>
                  <p className="font-bold text-sm text-foreground">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA row */}
        <div className="mt-12 flex flex-wrap gap-3 items-center">
          <Link href="/school-zone" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" /> View School Zone
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/articles" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
            Read Past Stories →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
