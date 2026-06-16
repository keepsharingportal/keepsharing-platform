// "This Month's Birthday Buzz" — top of the journey. Hyper-local
// freshness: featured venue, this month's article, monthly party
// photo. Editor refreshes monthly so moms have a reason to come back.
//
// v1 is intentionally light — copy is templated so the section never
// looks empty when content isn't loaded. Editor-managed data layer
// can be wired in a follow-up once the page is live.

import { Sparkles, MapPin, BookOpen } from 'lucide-react'

export function BirthdayThisMonth() {
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#ff7a59] to-[#ff9d8a] text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} />
          <span className="text-[12px] font-bold uppercase tracking-wider">This {monthName} in Birthdays</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 hidden sm:block">Updated monthly</span>
      </div>
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black/5">
        <Tile
          icon={MapPin}
          eyebrow="Venue of the month"
          title="Snapology"
          body="Lego + robotics parties for ages 4-10. Our editors named it July's standout for indoor parties — pure kid joy, zero stress for moms."
          link="#vendors"
        />
        <Tile
          icon={BookOpen}
          eyebrow="Read this first"
          title="Beat the August Heat: 8 indoor party spots that don't break the bank"
          body="Outdoor parties in July are a sweat factory. Here's where local moms are going instead."
          link="#articles"
        />
        <Tile
          icon={Sparkles}
          eyebrow="Real party"
          title="Eli&apos;s 4th — Dinosaur dig in the backyard"
          body="Pike Road mom Sarah turned her yard into a paleontology site for $87. Photos + supplies list →"
          link="#real-parties"
        />
      </div>
    </div>
  )
}

function Tile({ icon: Icon, eyebrow, title, body, link }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  eyebrow: string
  title:   string
  body:    string
  link:    string
}) {
  return (
    <a href={link} className="block p-5 hover:bg-[#fffaf5] transition-colors group">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ff7a59] mb-2">
        <Icon size={11} />
        {eyebrow}
      </div>
      <div className="text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[#ff7a59] transition-colors">
        {title}
      </div>
      <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">{body}</p>
    </a>
  )
}
