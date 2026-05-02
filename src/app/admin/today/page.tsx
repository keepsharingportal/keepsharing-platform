import { AlertCircle, Clock, Inbox, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { UrgentItemsList, type UrgentItem } from '@/components/today/UrgentItemsList'
import { DistributionWidget } from '@/components/distribution/DistributionWidget'
import { fillEmailTemplate } from '@/lib/email-templates'

// ── Publication list (static config, data comes from DB) ─────────────────────
const PUBLICATIONS = [
  { abbrev: 'RRP', name: 'River Region Parents', slug: 'rrp' },
  { abbrev: 'MBP', name: 'Mobile Bay Parents', slug: 'mbp' },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents', slug: 'aop' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents', slug: 'esp' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', slug: 'gpp' },
  { abbrev: 'RRB', name: 'River Region Boom', slug: 'boom' },
]

const PUB_COLORS: Record<string, string> = {
  RRP: '#22c55e', MBP: '#3b82f6', AOP: '#f97316',
  ESP: '#a855f7', GPP: '#14b8a6', RRB: '#eab308',
}

function SectionHeader({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon size={13} className={color} />
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getMarketPulse() {
  const supabase = await createClient()
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthStr = thisMonth.toISOString().split('T')[0]

  try {
    const { data: placements } = await supabase
      .from('print_placements')
      .select('publication_slug, page_size_fraction, monthly_revenue')
      .eq('issue_month', monthStr)

    const stats: Record<string, { count: number; pages: number; revenue: number }> = {}
    for (const p of placements ?? []) {
      const raw = (p.publication_slug ?? 'rrp').toUpperCase()
      const abbrev = raw === 'BOOM' ? 'RRB' : raw
      if (!stats[abbrev]) stats[abbrev] = { count: 0, pages: 0, revenue: 0 }
      stats[abbrev].count++
      stats[abbrev].pages += p.page_size_fraction ?? 0
      stats[abbrev].revenue += p.monthly_revenue ?? 0
    }
    return stats
  } catch {
    return {} as Record<string, { count: number; pages: number; revenue: number }>
  }
}

async function getActionItems(): Promise<{ urgent: UrgentItem[]; review: UrgentItem[] }> {
  const supabase = await createClient()

  try {
    const { data } = await supabase
      .from('action_items')
      .select('*')
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .limit(20)

    const urgent: UrgentItem[] = []
    const review: UrgentItem[] = []

    for (const item of data ?? []) {
      const filled = item.email_template_slug
        ? fillEmailTemplate(item.email_template_slug, {
            businessName: item.target_business_name,
            contactName:  item.target_contact_name,
          })
        : null

      const urgentItem: UrgentItem = {
        id:           item.id,
        name:         item.target_business_name ?? item.title,
        note:         item.title,
        phone:        item.target_phone ?? '',
        email:        item.target_email ?? undefined,
        action:       (item.action_type ?? 'action').replace(/_/g, ' '),
        urgency:      item.urgency === 'urgent' ? 'urgent' : 'review',
        days:         item.due_date
          ? Math.max(0, Math.ceil((new Date(item.due_date).getTime() - Date.now()) / 86400000))
          : undefined,
        emailSubject: filled?.subject ?? `Action required — ${item.target_business_name ?? item.title}`,
        emailDraft:   filled?.body ?? `Hi ${item.target_contact_name ?? 'there'},\n\n${item.notes ?? item.title}\n\nJason\nRiver Region Parents`,
      }

      if (item.urgency === 'urgent') urgent.push(urgentItem)
      else review.push(urgentItem)
    }

    return { urgent, review }
  } catch {
    return { urgent: [], review: [] }
  }
}

async function getIncoming() {
  const supabase = await createClient()
  const items: Array<{ id: string; type: string; label: string; time: string }> = []

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  try {
    const [spotsRes, nomRes, bdayRes] = await Promise.all([
      supabase.from('business_spotlight_submissions').select('id, business_name, created_at').eq('status', 'new').order('created_at', { ascending: false }).limit(3),
      supabase.from('nominations').select('id, nominee_name, nomination_type, created_at').eq('status', 'new').order('created_at', { ascending: false }).limit(3),
      supabase.from('birthday_spotlight_orders').select('id, child_name, amount_paid, created_at').order('created_at', { ascending: false }).limit(3),
    ])
    for (const s of spotsRes.data ?? []) {
      items.push({ id: s.id, type: 'Spotlight', label: `Business Spotlight — ${s.business_name}`, time: timeAgo(s.created_at) })
    }
    for (const n of nomRes.data ?? []) {
      items.push({ id: n.id, type: 'Nomination', label: `${n.nomination_type ?? 'Nomination'} — ${n.nominee_name}`, time: timeAgo(n.created_at) })
    }
    if ((bdayRes.data ?? []).length > 0) {
      const count = bdayRes.data!.length
      const total = bdayRes.data!.reduce((s, r) => s + (r.amount_paid ?? 0), 0)
      items.push({ id: 'bday', type: 'Orders', label: `${count} Birthday Spotlight order${count > 1 ? 's' : ''} (${formatCurrency(total)})`, time: timeAgo(bdayRes.data![0].created_at) })
    }
  } catch { /* return empty */ }

  return items
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TodayPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const [marketStats, actionItems, incoming] = await Promise.all([
    getMarketPulse(),
    getActionItems(),
    getIncoming(),
  ])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Good morning, Jason.</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Market Pulse */}
        <section>
          <SectionHeader icon={Activity} label="Market Pulse — This Month" color="text-gray-400" />
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {PUBLICATIONS.map(pub => {
              const stats = marketStats[pub.abbrev]
              return (
                <div key={pub.abbrev} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PUB_COLORS[pub.abbrev] }} />
                      <span className="text-xs font-bold text-gray-400">{pub.abbrev}</span>
                    </div>
                    {stats && stats.count > 0 && (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-2 truncate">{pub.name}</div>
                  {stats && stats.count > 0 ? (
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="text-xl font-bold text-gray-900">{stats.count}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Ads</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">{stats.pages.toFixed(1)}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Pages</div>
                      </div>
                      <div>
                        <div className="text-base font-bold" style={{ color: 'var(--color-gold-600)' }}>
                          {formatCurrency(stats.revenue)}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Revenue</div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No placements this month</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <SectionHeader icon={AlertCircle} label="Urgent — Click to Draft Email" color="text-red-500" />
            {actionItems.urgent.length > 0
              ? <UrgentItemsList items={actionItems.urgent} urgency="urgent" />
              : <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">No urgent items — inbox clear ✓</div>
            }
          </section>

          <div className="space-y-5">
            <section>
              <SectionHeader icon={Clock} label="Review This Week — Click to Draft" color="text-amber-500" />
              {actionItems.review.length > 0
                ? <UrgentItemsList items={actionItems.review} urgency="review" />
                : <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">Nothing due this week</div>
              }
            </section>

            <section>
              <SectionHeader icon={Inbox} label="Incoming" color="text-blue-500" />
              {incoming.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {incoming.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium ring-1 ring-blue-100">
                          {item.type}
                        </span>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-3">{item.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                  No new submissions yet — they&apos;ll appear here as they come in
                </div>
              )}
            </section>
          </div>
        </div>

        <section>
          <SectionHeader icon={Activity} label="Distribution Portal — drivers.keepsharing.com" color="text-blue-500" />
          <DistributionWidget />
        </section>
      </div>
    </div>
  )
}
