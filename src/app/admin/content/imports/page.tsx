import Link from 'next/link'
import { ArrowLeft, ArrowRight, FileText, Calendar, BookOpen, GraduationCap, Sun, Upload, Globe } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Imports & Uploads — Admin' }

const IMPORT_CARDS = [
  {
    icon: FileText,
    label: 'Article CSV Import',
    desc: 'Import pre-cleaned article spreadsheets. Use this for School Bits, Mom to Mom, and any content prepared in CSV format.',
    href: '/admin/content/articles-csv-import',
    badge: 'Primary',
    badgeColor: 'bg-portal-blue-lt text-portal-blue',
    cta: 'Open Article Importer',
  },
  {
    icon: GraduationCap,
    label: 'School Bits Import',
    desc: 'Same as Article CSV Import — select the school_bits_cleaned_import.csv file. Articles import as Pending Review automatically.',
    href: '/admin/content/articles-csv-import',
    badge: 'School Zone',
    badgeColor: 'bg-green-100 text-green-700',
    cta: 'Import School Bits',
  },
  {
    icon: Globe,
    label: 'WordPress XML Import',
    desc: 'Import an exported WordPress XML file. Strips shortcodes, maps categories, and imports articles as Pending Review.',
    href: '/admin/content/wp-import',
    badge: 'Migration',
    badgeColor: 'bg-purple-100 text-purple-700',
    cta: 'Open WP Importer',
  },
  {
    icon: Calendar,
    label: 'Event CSV Import',
    desc: 'Bulk-import upcoming events from a spreadsheet. Events import directly to the calendar.',
    href: '/admin/content/events-import',
    badge: 'Calendar',
    badgeColor: 'bg-orange-100 text-orange-700',
    cta: 'Import Events',
  },
  {
    icon: BookOpen,
    label: 'Guide Listings CSV',
    desc: 'Import businesses and listings for any of the 9 local guides (Family Resource, Private Schools, Summer Camp, Childcare, etc.).',
    href: '/admin/content/guide-listings-import',
    badge: 'Guides',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    cta: 'Import Guide Listings',
  },
  {
    icon: Sun,
    label: 'Summer Camp Import',
    desc: 'Import the Summer Camp guide listings from the dedicated summer camp spreadsheet template.',
    href: '/admin/guides/summer-import',
    badge: 'Summer',
    badgeColor: 'bg-portal-amber-lt text-portal-amber',
    cta: 'Import Summer Camps',
  },
  {
    icon: Upload,
    label: 'Media & Assets',
    desc: 'Upload hero images, photos, and media files used in articles and guide listings.',
    href: '/admin/assets',
    badge: 'Media',
    badgeColor: 'bg-gray-100 text-portal-sub',
    cta: 'Open Asset Library',
  },
]

const TIPS = [
  'All article imports arrive as Needs Review — nothing publishes automatically.',
  'After importing, open Review Queue to approve, edit, or reject articles.',
  'Always add hero images before approving. Articles without images look blank on the site.',
  'School Bits articles use column_slug = school-bits — use the Article CSV Import with the school_bits file.',
  'Guide listings import to both advertiser_accounts and guide_listings tables — duplicates are skipped automatically.',
]

export default function ImportsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/content" className="text-sm text-portal-blue hover:text-portal-blue flex items-center gap-1">
            <ArrowLeft size={13} /> Content
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-portal-text">Imports & Uploads</h1>
            <p className="text-sm text-portal-sub mt-0.5">All content import tools in one place</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-7">

        {/* Import cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {IMPORT_CARDS.map(card => (
            <div key={card.label} className="bg-white rounded-lg border border-portal-border p-5 flex flex-col gap-3 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <card.icon size={18} className="text-portal-sub" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-portal-text mb-1.5">{card.label}</h3>
                <p className="text-sm text-portal-sub leading-relaxed">{card.desc}</p>
              </div>

              <Link
                href={card.href}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                {card.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        {/* After importing */}
        <div className="bg-white rounded-lg border border-portal-border p-5">
          <h2 className="font-bold text-portal-text mb-1">After Importing</h2>
          <p className="text-sm text-portal-sub mb-4">
            Imported articles always land in the Review Queue as &ldquo;Needs Review.&rdquo; Nobody sees them publicly until you approve them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/articles/review"
              className="flex items-center gap-2 px-4 py-2 bg-portal-amber-lt border border-amber-200 text-portal-amber text-sm font-semibold rounded-lg hover:bg-portal-amber-lt transition-colors"
            >
              Open Review Queue →
            </Link>
            <Link
              href="/admin/articles"
              className="flex items-center gap-2 px-4 py-2 border border-portal-border text-portal-sub text-sm font-semibold rounded-lg hover:bg-portal-bg transition-colors"
            >
              All Articles →
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-portal-blue-lt border border-portal-blue/20 rounded-lg p-5">
          <h2 className="font-bold text-blue-900 mb-3 text-sm">Import Tips</h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-portal-blue">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-200 text-portal-blue flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
