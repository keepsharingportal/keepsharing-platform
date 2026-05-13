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
    badgeColor: 'bg-blue-100 text-blue-700',
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
    badgeColor: 'bg-amber-100 text-amber-700',
    cta: 'Import Summer Camps',
  },
  {
    icon: Upload,
    label: 'Media & Assets',
    desc: 'Upload hero images, photos, and media files used in articles and guide listings.',
    href: '/admin/assets',
    badge: 'Media',
    badgeColor: 'bg-gray-100 text-gray-600',
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
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/content" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <ArrowLeft size={13} /> Content
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Imports & Uploads</h1>
            <p className="text-sm text-gray-500 mt-0.5">All content import tools in one place</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-7">

        {/* Import cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {IMPORT_CARDS.map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <card.icon size={18} className="text-gray-600" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1.5">{card.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-1">After Importing</h2>
          <p className="text-sm text-gray-500 mb-4">
            Imported articles always land in the Review Queue as &ldquo;Needs Review.&rdquo; Nobody sees them publicly until you approve them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/articles/review"
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors"
            >
              Open Review Queue →
            </Link>
            <Link
              href="/admin/articles"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Articles →
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <h2 className="font-bold text-blue-900 mb-3 text-sm">Import Tips</h2>
          <ul className="space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-blue-800">
                <span className="shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
