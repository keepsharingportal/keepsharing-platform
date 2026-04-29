import { AlertCircle, Clock, Inbox, Activity, Phone } from 'lucide-react'
import { PUBLICATIONS, getMarketStats } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import { UrgentItemsList, type UrgentItem } from '@/components/today/UrgentItemsList'
import { DistributionWidget } from '@/components/distribution/DistributionWidget'

const URGENT_ITEMS: UrgentItem[] = [
  {
    id: 1,
    name: 'Courtyard by Marriott',
    note: 'March contract expires end of month — renewal not confirmed',
    phone: '(334) 555-0191',
    email: 'gm@courtyardmontgomery.com',
    action: 'Renew contract',
    urgency: 'urgent',
    emailSubject: 'Your River Region Parents Advertising — March Renewal',
    emailDraft: `Hi [Contact Name],

I hope March has been a great month for you! I wanted to reach out because your advertising agreement with River Region Parents expires at the end of the month, and I'd love to get you locked in for April and beyond.

Your quarter-page ad has been running well, and we have some great editorial content coming up in April that would pair nicely with your placement — including our Child Care Guide and the Newcomers feature.

Can we lock in your April ad this week? Same rate, same placement. I can have an agreement over to you same day.

Just reply here or give me a call at (334) 555-0100 and we'll get it done quickly.

Talk soon,
Jason Watson
River Region Parents`,
  },
  {
    id: 2,
    name: 'Prattville Christian Academy',
    note: 'DropBox art not verified — must send to Tim today',
    phone: '(334) 555-0142',
    email: 'admissions@prattvillechristian.org',
    action: 'Check Dropbox',
    urgency: 'urgent',
    emailSubject: 'Ad Artwork for March Issue — Quick Confirmation Needed',
    emailDraft: `Hi Principal Ford,

Quick follow-up on the March ad for River Region Parents — we have new artwork in our Dropbox folder but wanted to confirm it's the final version before we send it to our designer.

Could you take 2 minutes to confirm: is the artwork in Dropbox dated 2/28 the version you want to run in March? Or is there an updated file coming?

Our deadline to Tim is today, so any response by noon is extremely helpful.

Thank you!
Jason Watson
River Region Parents`,
  },
  {
    id: 3,
    name: 'Camp Cheaha',
    note: 'New advertiser — agreement not yet signed',
    phone: '(334) 555-0188',
    email: 'director@campCheaha.com',
    action: 'Send agreement',
    urgency: 'urgent',
    emailSubject: 'Welcome to River Region Parents — Agreement Ready to Sign',
    emailDraft: `Hi Director Weaver,

Welcome to River Region Parents! We're excited to have Camp Cheaha in the March issue.

I have your advertising agreement ready and waiting for your signature. It covers your quarter-page ad in March, May, and June (our Summer Camp Guide issue — perfect timing for your enrollment push).

I'll send the agreement link in a separate email momentarily. It takes about 2 minutes to review and sign digitally — no printing needed.

If you have any questions on the terms or want to discuss the ad design brief, I'm at (334) 555-0100 anytime this week.

Looking forward to a great partnership!
Jason Watson
River Region Parents`,
  },
]

const REVIEW_ITEMS: UrgentItem[] = [
  {
    id: 4,
    name: 'Imagination Station',
    note: 'Art in Dropbox needs verification before layout',
    phone: '(334) 555-0177',
    email: 'info@imaginationstation.com',
    action: 'Verify art',
    urgency: 'review',
    days: 5,
    emailSubject: 'Ad Artwork Verification — River Region Parents March Issue',
    emailDraft: `Hi Greg,

Checking in on your March ad for River Region Parents — we have what appears to be your artwork in our Dropbox folder, but want to confirm before sending to our designer.

Please take a look and let me know: is the file in Dropbox your current, approved artwork for this month's run?

If you'd like to make any changes before we go to print, this week is the time to do it. After Friday we're locked in with the designer.

Thanks for your quick reply!
Jason Watson
River Region Parents`,
  },
  {
    id: 5,
    name: 'Craig Eye Center',
    note: 'New ad design in progress with Tim — confirm deadline',
    phone: '(334) 555-0133',
    email: 'jennifer@craigeyecenter.com',
    action: 'Confirm deadline',
    urgency: 'review',
    days: 6,
    emailSubject: 'New Ad Design Update — Craig Eye Center',
    emailDraft: `Hi Jennifer,

Quick update on your new ad design for River Region Parents — Tim is working on it now based on the creative brief we discussed.

I wanted to make sure we're aligned on timeline: Tim's draft will be ready for your review by end of this week, and we'll need your approval by next Wednesday to make the March issue.

Does that timeline work for you? And is there anything you want to add to the brief before Tim gets too far along?

Looking forward to showing you what he comes up with!
Jason Watson
River Region Parents`,
  },
]

const INCOMING = [
  { id: 6, type: 'Spotlight', label: 'Business Spotlight submission — Montgomery YMCA', time: '2 hours ago' },
  { id: 7, type: 'Nomination', label: 'Mom to Mom nomination — Keisha Thompson', time: '4 hours ago' },
  { id: 8, type: 'Orders', label: '3 new Birthday Spotlight orders ($135 total)', time: 'This morning' },
]

const ACTIVITY = [
  'GHL renewal sequence triggered for 4 advertisers expiring in 30 days',
  'Monthly offer email queued for April 1 send — 312 recipients',
  '14 social posts approved and scheduled in GHL for this week',
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

export default function TodayPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const marketStats = PUBLICATIONS.map((pub) => ({
    pub,
    stats: getMarketStats(pub.abbrev, `${pub.abbrev} MAR26`),
  }))

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Good morning, Jason.</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today} · March 2026 issue in progress</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Market Pulse */}
        <section>
          <SectionHeader icon={Activity} label="Market Pulse — March 2026" color="text-gray-400" />
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {marketStats.map(({ pub, stats }) => (
              <div key={pub.abbrev} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PUB_COLORS[pub.abbrev] }} />
                    <span className="text-xs font-bold text-gray-400">{pub.abbrev}</span>
                  </div>
                  {stats.count > 0 && (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-800 mb-2 truncate">{pub.name}</div>
                {stats.count > 0 ? (
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
                  <p className="text-xs text-gray-400">No data yet</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Urgent — click any item to expand email draft */}
          <section>
            <SectionHeader icon={AlertCircle} label="Urgent — Click to Draft Email" color="text-red-500" />
            <UrgentItemsList items={URGENT_ITEMS} urgency="urgent" />
          </section>

          <div className="space-y-5">
            {/* Review this week */}
            <section>
              <SectionHeader icon={Clock} label="Review This Week — Click to Draft" color="text-amber-500" />
              <UrgentItemsList items={REVIEW_ITEMS} urgency="review" />
            </section>

            {/* Incoming */}
            <section>
              <SectionHeader icon={Inbox} label="Incoming" color="text-blue-500" />
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {INCOMING.map((item) => (
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
            </section>
          </div>
        </div>

        {/* Distribution Portal */}
        <section>
          <SectionHeader icon={Activity} label="Distribution Portal — drivers.keepsharing.com" color="text-blue-500" />
          <DistributionWidget />
        </section>

        {/* Automation Activity */}
        <section>
          <SectionHeader icon={Activity} label="Automation Activity" color="text-gray-400" />
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {ACTIVITY.map((text, i) => (
              <div key={i} className="flex items-start justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-4">{i === 2 ? 'Yesterday' : '6:00 AM'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
