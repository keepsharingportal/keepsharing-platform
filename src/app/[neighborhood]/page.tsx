import { notFound } from "next/navigation"
import Link from "next/link"
import { NEIGHBORHOODS, NEIGHBORHOOD_SLUGS, isValidSlug } from "@/lib/neighborhood"
import { NeighborhoodBanner } from "@/components/NeighborhoodBanner"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ neighborhood: string }>
}

export function generateStaticParams() {
  return NEIGHBORHOOD_SLUGS.map(slug => ({ neighborhood: slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { neighborhood } = await params
  if (!isValidSlug(neighborhood)) return {}
  const meta = NEIGHBORHOODS[neighborhood]
  return { title: `${meta.label} -- River Region Parents`, description: meta.description }
}

export default async function NeighborhoodPage({ params }: Props) {
  const { neighborhood } = await params
  if (!isValidSlug(neighborhood)) notFound()

  const meta = NEIGHBORHOODS[neighborhood]

  const sections = [
    { label: "School News",           desc: `Latest from ${meta.schoolDistrict}`, emoji: "🏫", href: `/school-news?area=${neighborhood}` },
    { label: "Summer Fun Guide",      desc: "Camps and activities near you",      emoji: "☀️", href: `/summer-fun-guide?area=${neighborhood}` },
    { label: "Student Spotlight",     desc: "Remarkable students in your area",   emoji: "🎓", href: `/rrp/student-spotlight` },
    { label: "Local Kid Cool Things", desc: "Kids doing amazing things here",     emoji: "🌟", href: `/rrp/local-kid` },
    { label: "Parent Poll",           desc: "This month's community question",    emoji: "📊", href: `/rrp/parent-poll` },
    { label: "Birthday Spotlights",   desc: "Celebrate local kids",               emoji: "🎂", href: `/birthday-spotlight` },
  ]

  return (
    <div className="min-h-screen bg-white">
      <NeighborhoodBanner />
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-3">River Region Parents</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">{meta.label}</h1>
          <p className="text-lg text-blue-100">{meta.description}</p>
          <p className="text-sm text-blue-200 mt-2">{meta.county} &middot; {meta.schoolDistrict}</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-5 py-12">
        <h2 className="text-lg font-bold text-gray-900 mb-5">{"What's happening in " + meta.label}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map(s => (
            <Link key={s.label} href={s.href}
              className="group block bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{s.emoji}</div>
              <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{s.label}</div>
              <div className="text-xs text-gray-500 mt-1">{s.desc}</div>
            </Link>
          ))}
        </div>
        <div className="mt-12 border-t border-gray-100 pt-8">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Other areas</div>
          <div className="flex flex-wrap gap-2">
            {NEIGHBORHOOD_SLUGS.filter(s => s !== neighborhood).map(slug => (
              <Link key={slug} href={"/" + slug}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors">
                {NEIGHBORHOODS[slug].label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}