'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Sparkles, DollarSign, FileText, Users, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Editorial schedule data ────────────────────────────────────────────────────

type Status = 'live' | 'coming-soon' | 'planning'
type Category = 'recurring' | 'series' | 'annual'

type ContentFeature = {
  id: string
  name: string
  description: string
  category: Category
  /** null = was always here; 1-12 = calendar month when feature launches */
  launchMonth: number | null
  /** Array of month numbers (1-12) it appears in, or 'all' */
  activeMonths: number[] | 'all'
  status: Status
  sponsorOpportunity: string
  hasPublicForm: boolean
  formPath?: string
  color: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Based on current date (April 2026 = month 4), derive live/coming-soon status
const NOW_MONTH = new Date().getMonth() + 1 // 1-indexed

function statusFromLaunch(launch: number | null): Status {
  if (launch === null) return 'live'
  if (launch <= NOW_MONTH) return 'live'
  if (launch <= NOW_MONTH + 2) return 'coming-soon'
  return 'planning'
}

const FEATURES: ContentFeature[] = [
  // ── Recurring (always existed) ──────────────────────────────────────────────
  {
    id: 'school-bits',
    name: 'School Bits',
    description: 'Quick school news blurbs from across the River Region — submitted by schools and parents.',
    category: 'recurring', launchMonth: null, activeMonths: 'all',
    status: 'live',
    sponsorOpportunity: 'Educational Services, School Supply, Tutoring Centers',
    hasPublicForm: true, formPath: '/submit/school-news',
    color: 'bg-blue-100 text-blue-800 ring-blue-200',
  },
  {
    id: 'mom-to-mom',
    name: 'Mom to Mom',
    description: 'First-person story from a local mom — voice AI interview, Claude-generated article.',
    category: 'recurring', launchMonth: null, activeMonths: 'all',
    status: 'live',
    sponsorOpportunity: "Women's Health, OB/GYN, Boutiques, Wellness Brands",
    hasPublicForm: true, formPath: '/nominate/mom-to-mom',
    color: 'bg-pink-100 text-pink-800 ring-pink-200',
  },
  {
    id: 'grands-are-great',
    name: "Grands Are Great",
    description: "Celebrating grandparent stories — one family's bond per issue.",
    category: 'recurring', launchMonth: null, activeMonths: 'all',
    status: 'live',
    sponsorOpportunity: 'Senior Care, Long-Term Care Insurance, Life Insurance, Senior Living',
    hasPublicForm: true, formPath: '/nominate/grands-are-great',
    color: 'bg-amber-100 text-amber-800 ring-amber-200',
  },
  {
    id: 'teacher-of-month',
    name: 'Teacher of the Month',
    description: 'Celebrating an outstanding educator nominated by the community.',
    category: 'recurring', launchMonth: null, activeMonths: 'all',
    status: 'live',
    sponsorOpportunity: 'Orthodontist, Pediatric Dentist, Hospital, Bank (prominent brand exposure)',
    hasPublicForm: true, formPath: '/nominate/teacher-of-month',
    color: 'bg-gold-100 text-amber-800 ring-amber-200',
  },
  {
    id: 'family-calendar',
    name: 'Family Calendar',
    description: 'Monthly events calendar — community events, school events, family activities.',
    category: 'recurring', launchMonth: null, activeMonths: 'all',
    status: 'live',
    sponsorOpportunity: 'Activity Centers, Performing Arts, Museums, Gyms',
    hasPublicForm: false,
    color: 'bg-green-100 text-green-800 ring-green-200',
  },
  {
    id: 'summer-camp-guide',
    name: 'Summer Fun / Camp Guide',
    description: 'Annual summer camps and activities directory — premium editorial space.',
    category: 'recurring', launchMonth: null, activeMonths: [3, 4, 5, 6],
    status: 'live',
    sponsorOpportunity: 'Summer Camps, YMCAs, Recreation Programs, Travel',
    hasPublicForm: false,
    color: 'bg-teal-100 text-teal-800 ring-teal-200',
  },

  // ── Month 1-2 launches ──────────────────────────────────────────────────────
  {
    id: 'student-spotlight',
    name: 'Student Spotlight',
    description: 'Featuring a River Region student doing exceptional things academically or in the community.',
    category: 'series', launchMonth: 1, activeMonths: 'all',
    status: statusFromLaunch(1),
    sponsorOpportunity: 'Private Schools, Tutoring, College Prep, STEM Programs',
    hasPublicForm: false,
    color: 'bg-purple-100 text-purple-800 ring-purple-200',
  },
  {
    id: 'parent-poll',
    name: 'Parent Poll',
    description: 'Monthly community poll on a topic relevant to River Region parents.',
    category: 'series', launchMonth: 2, activeMonths: 'all',
    status: statusFromLaunch(2),
    sponsorOpportunity: 'Varies by poll topic — high engagement feature',
    hasPublicForm: false,
    color: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  },

  // ── Month 3-4 launches ──────────────────────────────────────────────────────
  {
    id: 'local-kid',
    name: 'Local Kid Doing Cool Things',
    description: 'Spotlight on a child with an inspiring hobby, passion project, or talent.',
    category: 'series', launchMonth: 3, activeMonths: 'all',
    status: statusFromLaunch(3),
    sponsorOpportunity: 'YMCA, Youth Sports, Dance Studios, Music Lessons, Art Schools',
    hasPublicForm: false,
    color: 'bg-orange-100 text-orange-800 ring-orange-200',
  },
  {
    id: 'ask-the-expert',
    name: 'Ask the Expert',
    description: 'Monthly Q&A with a local expert on parenting-adjacent topics.',
    category: 'series', launchMonth: 4, activeMonths: 'all',
    status: statusFromLaunch(4),
    sponsorOpportunity: 'Pediatricians, Orthodontists, Financial Planners, Therapists, Lawyers',
    hasPublicForm: false,
    color: 'bg-sky-100 text-sky-800 ring-sky-200',
  },

  // ── Month 5-6 launches ──────────────────────────────────────────────────────
  {
    id: 'classroom-of-month',
    name: 'Classroom of the Month',
    description: "Celebrating an outstanding classroom and teacher doing innovative work.",
    category: 'series', launchMonth: 5, activeMonths: 'all',
    status: statusFromLaunch(5),
    sponsorOpportunity: "School Supply Companies, Teachers' Credit Unions, Education Non-Profits",
    hasPublicForm: false,
    color: 'bg-lime-100 text-lime-800 ring-lime-200',
  },
  {
    id: 'werrpsk',
    name: 'What Every RR Parent Should Know',
    description: 'Monthly resource round-up — safety, health, school, legal, or community topic.',
    category: 'series', launchMonth: 6, activeMonths: 'all',
    status: statusFromLaunch(6),
    sponsorOpportunity: 'Hospital Systems, Pediatric Practices, Law Firms, Insurance',
    hasPublicForm: false,
    color: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  },

  // ── Month 7-8 launches ──────────────────────────────────────────────────────
  {
    id: 'why-we-love',
    name: 'Why We Love Raising Kids Here',
    description: 'Community celebration — what makes the River Region special for families.',
    category: 'series', launchMonth: 7, activeMonths: 'all',
    status: statusFromLaunch(7),
    sponsorOpportunity: 'Real Estate, Home Builders, Mortgage Lenders, Moving Companies',
    hasPublicForm: false,
    color: 'bg-rose-100 text-rose-800 ring-rose-200',
  },
  {
    id: 'new-around-town',
    name: 'New Around Town',
    description: "Welcome and resources for families new to the River Region.",
    category: 'series', launchMonth: 8, activeMonths: 'all',
    status: statusFromLaunch(8),
    sponsorOpportunity: 'Storage, Moving Companies, Utilities, New Resident Services',
    hasPublicForm: false,
    color: 'bg-violet-100 text-violet-800 ring-violet-200',
  },

  // ── Month 9-10 launches ─────────────────────────────────────────────────────
  {
    id: 'family-story',
    name: 'River Region Family Story',
    description: 'Long-form profile of a local family — their journey, their community, their story.',
    category: 'series', launchMonth: 9, activeMonths: 'all',
    status: statusFromLaunch(9),
    sponsorOpportunity: 'Financial Institutions, Life Insurance, Family Photography',
    hasPublicForm: false,
    color: 'bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200',
  },
  {
    id: 'coachs-corner',
    name: "Coach's Corner",
    description: 'Spotlight on a local youth coach making a difference.',
    category: 'series', launchMonth: 10, activeMonths: 'all',
    status: statusFromLaunch(10),
    sponsorOpportunity: "Sports Equipment, Youth Sports Leagues, Athletic Wear, Nutrition",
    hasPublicForm: false,
    color: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  },

  // ── Annual events ───────────────────────────────────────────────────────────
  {
    id: 'cutest-pet',
    name: 'Cutest Pet Contest',
    description: 'Community photo contest — readers submit pet photos, public votes, winner featured.',
    category: 'annual', launchMonth: 9, activeMonths: [9, 10, 11],
    status: statusFromLaunch(9),
    sponsorOpportunity: 'Veterinarians, Pet Stores, Grooming Services, Pet Insurance',
    hasPublicForm: false,
    color: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  },
  {
    id: 'senior-sendoff',
    name: 'Senior Sendoff',
    description: "Annual May tribute to graduating seniors — photo submissions, family congratulations ads.",
    category: 'annual', launchMonth: 5, activeMonths: [5],
    status: 'planning',
    sponsorOpportunity: 'Senior Portrait Studios, Florists, Jewelry, Party Venues, Scholarships',
    hasPublicForm: false,
    color: 'bg-gold-100 text-amber-700 ring-amber-200',
  },
]

// ── Helper functions ──────────────────────────────────────────────────────────

function featureRunsInMonth(f: ContentFeature, monthIdx: number): boolean {
  const month = monthIdx + 1
  if (f.activeMonths === 'all') {
    if (f.launchMonth !== null && month < f.launchMonth) return false
    return true
  }
  return (f.activeMonths as number[]).includes(month)
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'list'
type Filter = 'all' | 'live' | 'coming-soon' | 'planning'

export function ContentCalendarClient() {
  const [view, setView]               = useState<ViewMode>('grid')
  const [filter, setFilter]           = useState<Filter>('all')
  const [selectedFeature, setSelectedFeature] = useState<ContentFeature | null>(null)

  const filtered = filter === 'all' ? FEATURES : FEATURES.filter(f => f.status === filter)

  const statusConfig: Record<Status, { label: string; icon: React.ElementType; cls: string }> = {
    'live':         { label: 'Live',         icon: CheckCircle2, cls: 'bg-green-50 text-green-700 ring-green-200' },
    'coming-soon':  { label: 'Coming Soon',  icon: Clock,        cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    'planning':     { label: 'Planning',     icon: Sparkles,     cls: 'bg-gray-50 text-gray-500 ring-gray-200' },
  }

  const counts = {
    live:         FEATURES.filter(f => f.status === 'live').length,
    'coming-soon': FEATURES.filter(f => f.status === 'coming-soon').length,
    planning:     FEATURES.filter(f => f.status === 'planning').length,
  }

  return (
    <div className="flex-1 overflow-y-auto">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editorial Content Calendar</h1>
          <p className="text-xs text-gray-500 mt-0.5">12-month schedule · River Region Parents</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('grid')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors', view === 'grid' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors', view === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
          >
            List
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(counts) as [Status, number][]).map(([status, count]) => {
            const cfg = statusConfig[status]
            return (
              <button
                key={status}
                onClick={() => setFilter(filter === status ? 'all' : status)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border transition-all text-left',
                  filter === status ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cfg.cls.split(' ')[0])}>
                  <cfg.icon size={16} className={cfg.cls.split(' ')[1]} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{cfg.label}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── GRID VIEW ──────────────────────────────────────────────────── */}
        {view === 'grid' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap w-48 z-10 border-r border-gray-100">
                      Content Feature
                    </th>
                    {MONTHS.map((m, i) => (
                      <th
                        key={m}
                        className={cn(
                          'px-2 py-3 font-semibold text-center whitespace-nowrap w-14',
                          i + 1 === NOW_MONTH ? 'text-blue-700 bg-blue-50' : 'text-gray-500 bg-gray-50'
                        )}
                      >
                        {m}
                        {i + 1 === NOW_MONTH && (
                          <div className="text-[9px] text-blue-500 font-medium">NOW</div>
                        )}
                      </th>
                    ))}
                    <th className="px-3 py-3 font-semibold text-gray-500 bg-gray-50 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Category headers */}
                  {[
                    { cat: 'recurring' as const, label: 'Recurring Features' },
                    { cat: 'series' as const, label: 'New Content Series' },
                    { cat: 'annual' as const, label: 'Annual Events' },
                  ].map(({ cat, label }) => {
                    const catFeatures = filtered.filter(f => f.category === cat)
                    if (catFeatures.length === 0) return null
                    return (
                      <>
                        <tr key={`header-${cat}`} className="bg-gray-50/80">
                          <td
                            colSpan={14}
                            className="sticky left-0 px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 z-10"
                          >
                            {label}
                          </td>
                        </tr>
                        {catFeatures.map(f => {
                          const cfg = statusConfig[f.status]
                          return (
                            <tr
                              key={f.id}
                              className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                              onClick={() => setSelectedFeature(f)}
                            >
                              <td className="sticky left-0 bg-white px-4 py-2.5 z-10 border-r border-gray-100 hover:bg-blue-50/30">
                                <div className="font-semibold text-gray-900 leading-tight">{f.name}</div>
                                {f.hasPublicForm && (
                                  <div className="text-[10px] text-green-600 mt-0.5 flex items-center gap-0.5">
                                    <FileText size={9} /> Form active
                                  </div>
                                )}
                              </td>
                              {MONTHS.map((_, i) => {
                                const active = featureRunsInMonth(f, i)
                                const isCurrent = i + 1 === NOW_MONTH
                                return (
                                  <td
                                    key={i}
                                    className={cn(
                                      'px-1 py-2.5 text-center',
                                      isCurrent ? 'bg-blue-50/50' : ''
                                    )}
                                  >
                                    {active ? (
                                      <div
                                        className={cn(
                                          'w-5 h-5 rounded-full mx-auto flex items-center justify-center',
                                          f.status === 'live' ? 'bg-green-500' :
                                          f.status === 'coming-soon' ? 'bg-amber-400' :
                                          'bg-gray-200'
                                        )}
                                      >
                                        <span className="text-white text-[8px]">✓</span>
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 mx-auto" />
                                    )}
                                  </td>
                                )
                              })}
                              <td className="px-3 py-2.5">
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 whitespace-nowrap', cfg.cls)}>
                                  {cfg.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /> Live</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-400" /> Coming soon</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-200" /> Planning</div>
              <div className="text-gray-400 ml-auto">Click any feature for sponsor + form details</div>
            </div>
          </div>
        )}

        {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
        {view === 'list' && (
          <div className="space-y-2">
            {filtered.map(f => {
              const cfg = statusConfig[f.status]
              return (
                <div
                  key={f.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 cursor-pointer transition-colors"
                  onClick={() => setSelectedFeature(f)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1', f.color)}>
                          {f.category === 'recurring' ? 'Recurring' : f.category === 'annual' ? 'Annual' : 'Series'}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1', cfg.cls)}>
                          {cfg.label}
                        </span>
                        {f.hasPublicForm && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 bg-green-50 text-green-700 ring-green-200 flex items-center gap-0.5">
                            <FileText size={9} /> Form active
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{f.description}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 justify-end mb-1">
                        <DollarSign size={11} />
                        <span className="text-[11px]">Sponsor</span>
                      </div>
                      <div className="text-[11px] text-gray-600 max-w-48 text-right">{f.sponsorOpportunity}</div>
                    </div>
                  </div>
                  {/* Month pills */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {MONTHS.map((m, i) => {
                      const active = featureRunsInMonth(f, i)
                      const isCurrent = i + 1 === NOW_MONTH
                      if (!active) return null
                      return (
                        <span
                          key={i}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-medium',
                            isCurrent ? 'bg-blue-600 text-white' :
                            f.status === 'live' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' :
                            f.status === 'coming-soon' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                            'bg-gray-100 text-gray-500'
                          )}
                        >
                          {m}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Feature detail drawer ─────────────────────────────────────── */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedFeature(null)}
          />
          <div className="relative z-10 bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1', selectedFeature.color)}>
                    {selectedFeature.category === 'recurring' ? 'Recurring' : selectedFeature.category === 'annual' ? 'Annual' : 'Series'}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1', statusConfig[selectedFeature.status].cls)}>
                    {statusConfig[selectedFeature.status].label}
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-900">{selectedFeature.name}</h2>
              </div>
              <button onClick={() => setSelectedFeature(null)} className="text-gray-400 hover:text-gray-700 mt-1">✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">{selectedFeature.description}</p>

              {/* Months */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Runs In</div>
                <div className="flex flex-wrap gap-1.5">
                  {MONTHS.map((m, i) => {
                    const active = featureRunsInMonth(selectedFeature, i)
                    const isCurrent = i + 1 === NOW_MONTH
                    return (
                      <span
                        key={i}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          !active ? 'bg-gray-100 text-gray-300' :
                          isCurrent ? 'bg-blue-600 text-white' :
                          selectedFeature.status === 'live' ? 'bg-green-100 text-green-700' :
                          'bg-amber-50 text-amber-600'
                        )}
                      >
                        {m}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Sponsor opportunity */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                  <DollarSign size={12} /> Sponsor Opportunity
                </div>
                <p className="text-xs text-amber-700">{selectedFeature.sponsorOpportunity}</p>
              </div>

              {/* Public form */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                  <FileText size={12} /> Public Submission Form
                </div>
                {selectedFeature.hasPublicForm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-700 font-medium">Active</span>
                    {selectedFeature.formPath && (
                      <a
                        href={selectedFeature.formPath}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                        target="_blank" rel="noopener noreferrer"
                      >
                        <ExternalLink size={10} /> {selectedFeature.formPath}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    No public form yet —{' '}
                    {selectedFeature.status === 'live' ? 'form should be created' : 'will be built when feature launches'}
                  </div>
                )}
              </div>

              {/* Launch info */}
              {selectedFeature.launchMonth && (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">Launch month:</span> {MONTHS[selectedFeature.launchMonth - 1]}
                  {selectedFeature.launchMonth > NOW_MONTH && (
                    <span className="ml-2 text-amber-600 font-medium">
                      ({selectedFeature.launchMonth - NOW_MONTH} month{selectedFeature.launchMonth - NOW_MONTH !== 1 ? 's' : ''} away)
                    </span>
                  )}
                </div>
              )}

              {/* Publisher note */}
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <Users size={12} className="shrink-0 mt-0.5 text-blue-500" />
                <span>Publishers see their market&apos;s version of this calendar filtered to their publication.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
