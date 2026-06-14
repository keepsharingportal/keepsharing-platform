'use client'

import { useState, useMemo } from 'react'
import { Phone, Mail, Check, RefreshCw, Inbox, Clock, BarChart2 } from 'lucide-react'

interface Lead {
  id: string
  lead_first_name?: string | null
  lead_last_name?: string | null
  lead_email?: string | null
  lead_phone?: string | null
  offer_type?: string | null
  created_at: string
  status?: string | null
  partner_last_action_at?: string | null
  partner_marked_converted?: boolean | null
  partner_marked_converted_at?: string | null
}

interface Account {
  business_name: string
  slug: string
  contact_name?: string | null
}

type Tab = 'inbox' | 'reminders' | 'stats'
type LeadFilter = 'all' | 'needs-followup' | 'contacted' | 'converted'

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function LeadCard({ lead, onAction }: { lead: Lead; onAction: (id: string, action: 'contacted' | 'converted') => void }) {
  const [acting, setActing] = useState(false)
  const fullName = [lead.lead_first_name, lead.lead_last_name].filter(Boolean).join(' ') || 'Unknown'
  const isConverted = !!lead.partner_marked_converted
  const isContacted = !!lead.partner_last_action_at

  async function act(action: 'contacted' | 'converted') {
    setActing(true)
    try {
      await fetch('/api/partner-leads/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, action }),
      })
      onAction(lead.id, action)
    } catch { /* optimistic */ onAction(lead.id, action) }
    setActing(false)
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 2 }}>{fullName}</p>
          <p style={{ fontSize: 11, color: '#999' }}>{timeAgo(lead.created_at)} · {lead.offer_type?.replace(/_/g, ' ') ?? 'form submission'}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isConverted ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: '#edf5f0', color: '#2d5a3d', letterSpacing: '0.08em' }}>CONVERTED</span>
          ) : isContacted ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: '#e8f0fc', color: '#1a2744', letterSpacing: '0.08em' }}>CONTACTED</span>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: '#fdf6e3', color: '#8b6a1a', letterSpacing: '0.08em' }}>NEW</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {lead.lead_phone && (
          <a href={`tel:${lead.lead_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#4a90d9', textDecoration: 'none', fontWeight: 600 }}>
            <Phone size={13} /> {lead.lead_phone}
          </a>
        )}
        {lead.lead_email && (
          <a href={`mailto:${lead.lead_email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#666', textDecoration: 'none' }}>
            <Mail size={13} /> {lead.lead_email}
          </a>
        )}
      </div>
      {!isConverted && (
        <div style={{ display: 'flex', gap: 8 }}>
          {!isContacted && (
            <button onClick={() => act('contacted')} disabled={acting} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {acting ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Mark as Contacted
            </button>
          )}
          <button onClick={() => act('converted')} disabled={acting} style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, backgroundColor: '#edf5f0', color: '#2d5a3d', border: '1px solid rgba(45,90,61,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Check size={12} /> Mark as Converted
          </button>
        </div>
      )}
    </div>
  )
}

export function PartnerDashboard({ account, initialLeads, token }: { account: Account; initialLeads: Lead[]; token: string | null }) {
  const [tab, setTab] = useState<Tab>('inbox')
  const [filter, setFilter] = useState<LeadFilter>('all')
  const [leads, setLeads] = useState(initialLeads)

  function handleAction(id: string, action: 'contacted' | 'converted') {
    setLeads(ls => ls.map(l => l.id === id ? {
      ...l,
      partner_last_action_at: action === 'contacted' ? new Date().toISOString() : l.partner_last_action_at,
      partner_marked_converted: action === 'converted' ? true : l.partner_marked_converted,
    } : l))
  }

  const filteredLeads = useMemo(() => {
    switch (filter) {
      case 'needs-followup': return leads.filter(l => !l.partner_marked_converted && !l.partner_last_action_at)
      case 'contacted': return leads.filter(l => l.partner_last_action_at && !l.partner_marked_converted)
      case 'converted': return leads.filter(l => l.partner_marked_converted)
      default: return leads
    }
  }, [leads, filter])

  const overdueLeads = leads.filter(l => {
    const hours = (Date.now() - new Date(l.created_at).getTime()) / 3600000
    return hours > 24 && !l.partner_last_action_at && !l.partner_marked_converted
  })

  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthLeads = leads.filter(l => new Date(l.created_at) >= thisMonth)
  const convertedLeads = leads.filter(l => l.partner_marked_converted)
  const convRate = leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0

  const tabStyle = (t: Tab) => ({
    padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    borderBottom: tab === t ? '2px solid #1a2744' : '2px solid transparent',
    color: tab === t ? '#1a2744' : '#888',
    background: 'none',
  } as React.CSSProperties)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#1a2744', padding: '16px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>River Region Parents · Partner Dashboard</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{account.business_name}</p>
          </div>
          {overdueLeads.length > 0 && (
            <div style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, backgroundColor: '#ef6442', color: 'white' }}>
              {overdueLeads.length} lead{overdueLeads.length > 1 ? 's' : ''} need follow-up
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex' }}>
          <button style={tabStyle('inbox')} onClick={() => setTab('inbox')}>
            <Inbox size={14} style={{ display: 'inline', marginRight: 6 }} />
            Lead Inbox ({leads.length})
          </button>
          <button style={tabStyle('reminders')} onClick={() => setTab('reminders')}>
            <Clock size={14} style={{ display: 'inline', marginRight: 6 }} />
            Reminders {overdueLeads.length > 0 ? `(${overdueLeads.length})` : ''}
          </button>
          <button style={tabStyle('stats')} onClick={() => setTab('stats')}>
            <BarChart2 size={14} style={{ display: 'inline', marginRight: 6 }} />
            Stats
          </button>
          {/* Performance report link */}
          <a
            href={`/partners/${account.slug}/performance`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#ef6442', textDecoration: 'none', borderBottom: '2px solid transparent', marginLeft: 'auto' }}
          >
            View Full Report →
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>

        {/* Tab: Inbox */}
        {tab === 'inbox' && (
          <>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(['all', 'needs-followup', 'contacted', 'converted'] as LeadFilter[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', backgroundColor: filter === f ? '#1a2744' : 'white', color: filter === f ? 'white' : '#666', border: filter === f ? 'none' : '1px solid rgba(0,0,0,0.1)' }}>
                  {f === 'needs-followup' ? 'Need Follow-Up' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {filteredLeads.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 16, color: '#888' }}>No leads match this filter.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onAction={handleAction} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Reminders */}
        {tab === 'reminders' && (
          <>
            <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>
                {overdueLeads.length > 0
                  ? `You have ${overdueLeads.length} lead${overdueLeads.length > 1 ? 's' : ''} waiting for follow-up`
                  : 'All caught up! No overdue leads.'}
              </p>
              <p style={{ fontSize: 13, color: '#888' }}>
                Leads submitted more than 24 hours ago that haven&apos;t been contacted. Speed matters — call these first.
              </p>
            </div>
            {overdueLeads.length === 0 ? (
              <div style={{ backgroundColor: '#edf5f0', borderRadius: 14, padding: '32px 24px', textAlign: 'center', border: '1px solid rgba(90,138,106,0.2)' }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>✓</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#2d5a3d' }}>You&apos;re all caught up!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {overdueLeads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(lead => (
                  <LeadCard key={lead.id} lead={lead} onAction={handleAction} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Stats */}
        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'This Month', value: monthLeads.length, sub: 'leads' },
                { label: 'All Time', value: leads.length, sub: 'leads' },
                { label: 'Converted', value: convertedLeads.length, sub: 'total' },
                { label: 'Conv. Rate', value: `${convRate}%`, sub: 'of all leads' },
              ].map((stat, i) => (
                <div key={i} style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px 18px', border: '1px solid rgba(0,0,0,0.07)', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 32, fontWeight: 700, color: '#1a2744', marginBottom: 4 }}>{stat.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: '#bbb' }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {leads.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '48px 24px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 15, color: '#888' }}>Stats will appear once leads start coming in.</p>
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '24px 20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginBottom: 16 }}>Lead Status Breakdown</p>
                {[
                  { label: 'Submitted', count: leads.length, color: '#4a90d9' },
                  { label: 'Contacted', count: leads.filter(l => l.partner_last_action_at).length, color: '#5a8a6a' },
                  { label: 'Converted', count: convertedLeads.length, color: '#ef6442' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#555' }}>{s.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{s.count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, backgroundColor: s.color, width: `${leads.length > 0 ? (s.count / leads.length) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
