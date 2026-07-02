'use client'

// StopsBrowserClient — driver's browse-mode list of stops on a route.
// Tapping any stop opens a bottom sheet with address, directions,
// preset notes, performance history at that stop (last 6 months of
// this driver's runs), and a "Report a problem" section that fires a
// change_request to admin.
//
// Reuses the visual vocabulary of the checklist portal (dark navy top,
// pubs pills, sheet primitive) so it feels like the same app.

import { useEffect, useRef, useState } from 'react'

interface Stop {
  id:                  string
  sort_order:          number
  name:                string
  address:             string | null
  city:                string | null
  zip:                 string | null
  quantities:          Record<string, number> | null
  notes:               string | null
  contact_name?:       string | null
  contact_phone?:      string | null
  contact_email?:      string | null
  is_pickup:           boolean
  not_delivering:      boolean
  not_delivering_note: string | null
  is_advertiser:       boolean
}

interface Route { id: string; name: string }

interface Props {
  market:     string
  driverName: string
  route:      Route
  stops:      Stop[]
}

interface HistoryEntry {
  month:          string
  status:         string
  checked:        boolean
  driver_note:    string | null
  leftovers:      number
  leftovers_json: Record<string, number> | null
  photo_urls:     string[]
}

// Category vocabulary for the "Edit Stop or Report Issue" driver flow.
// Each category may open an editable form pre-filled with the stop's
// current values. Admin review pre-fills with these proposed edits.
type CategoryKey = 'closed' | 'wrong_address' | 'wrong_qty' | 'new_contact' | 'new_stop' | 'other'
const CATEGORIES: Array<{ key: CategoryKey; label: string; icon: string }> = [
  { key: 'closed',        label: 'Location closed',  icon: '🚫' },
  { key: 'wrong_address', label: 'Address change',   icon: '📍' },
  { key: 'wrong_qty',     label: 'Change mag totals', icon: '📚' },
  { key: 'new_contact',   label: 'New contact',      icon: '👤' },
  { key: 'new_stop',      label: 'New stop nearby',  icon: '➕' },
  { key: 'other',         label: 'Other',            icon: '📝' },
]

const PUB_COLORS: Record<string, { bg: string; fg: string }> = {
  RRP:  { bg: '#DBEAFE', fg: '#1A5FA8' },
  BOOM: { bg: '#FEF3C7', fg: '#B45309' },
}
function pubColor(key: string) {
  return PUB_COLORS[key.toUpperCase()] ?? { bg: '#F1F5F9', fg: '#64748B' }
}

interface SheetState {
  stop:        Stop
  history:     HistoryEntry[] | null
  // 'closed' opens the sheet with the report UI already visible; null
  // means the report UI is hidden. Picking a category opens the form.
  category:    CategoryKey | null
  reportOpen:  boolean
  // Per-category form state — only the relevant subset is used per
  // category, but keeping one flat state keeps the JSX simple.
  addressForm: { address: string; city: string; zip: string }
  qtyForm:     Record<string, number>
  contactForm: { contact_name: string; contact_phone: string; contact_email: string }
  notes:       string
  submitting:  boolean
}

export function StopsBrowserClient({ market, driverName, route, stops }: Props) {
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function flashToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  async function openStop(stop: Stop) {
    setSheet({
      stop,
      history:     null,
      reportOpen:  false,
      category:    null,
      addressForm: { address: stop.address ?? '', city: stop.city ?? '', zip: stop.zip ?? '' },
      qtyForm:     { ...(stop.quantities ?? {}) },
      contactForm: { contact_name: stop.contact_name ?? '', contact_phone: stop.contact_phone ?? '', contact_email: stop.contact_email ?? '' },
      notes:       '',
      submitting:  false,
    })
    try {
      const res = await fetch(`/api/circulation/driver/stop-history?stop_id=${encodeURIComponent(stop.id)}`)
      if (!res.ok) throw new Error('load')
      const j = await res.json() as { history: HistoryEntry[] }
      setSheet(prev => prev ? { ...prev, history: j.history } : prev)
    } catch {
      setSheet(prev => prev ? { ...prev, history: [] } : prev)
    }
  }

  // Compose the proposed_changes payload for the current category.
  function buildPayload(s: SheetState): { flag: CategoryKey; proposed_changes: Record<string, unknown> | null; detail: string; notes: string } | null {
    if (!s.category) return null
    let proposed: Record<string, unknown> | null = null
    let detail = ''
    switch (s.category) {
      case 'wrong_address':
        proposed = {
          address: s.addressForm.address.trim() || null,
          city:    s.addressForm.city.trim()    || null,
          zip:     s.addressForm.zip.trim()     || null,
        }
        detail = [proposed.address, proposed.city, proposed.zip].filter(Boolean).join(', ')
        break
      case 'wrong_qty':
        proposed = { quantities: Object.fromEntries(Object.entries(s.qtyForm).filter(([, v]) => typeof v === 'number' && v >= 0)) }
        detail = Object.entries(proposed.quantities as Record<string, number>).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')
        break
      case 'new_contact':
        proposed = {
          contact_name:  s.contactForm.contact_name.trim()  || null,
          contact_phone: s.contactForm.contact_phone.trim() || null,
          contact_email: s.contactForm.contact_email.trim() || null,
        }
        detail = [proposed.contact_name, proposed.contact_phone, proposed.contact_email].filter(Boolean).join(' · ')
        break
      case 'closed':
      case 'new_stop':
      case 'other':
      default:
        proposed = null
        break
    }
    return { flag: s.category, proposed_changes: proposed, detail, notes: s.notes }
  }

  async function submitChange() {
    if (!sheet) return
    const payload = buildPayload(sheet)
    if (!payload) return
    setSheet({ ...sheet, submitting: true })
    try {
      const res = await fetch('/api/circulation/driver/change-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          stop_id:          sheet.stop.id,
          flag:             payload.flag,
          detail:           payload.detail,
          notes:            payload.notes,
          proposed_changes: payload.proposed_changes,
        }),
      })
      if (!res.ok) throw new Error('submit')
      setSheet(null)
      flashToast('Change submitted — admin will review')
    } catch {
      setSheet(sheet ? { ...sheet, submitting: false } : null)
      flashToast('Could not send — try again')
    }
  }

  // Performance summary per stop's history — quick numbers to show at top.
  function summarize(history: HistoryEntry[]) {
    const delivered = history.filter(h => h.checked).length
    const runs      = history.length
    const leftover  = history.reduce((s, h) => s + (h.leftovers ?? 0), 0)
    return { delivered, runs, leftover }
  }

  const eligibleStops = stops.filter(s => !s.is_pickup && !s.not_delivering)

  return (
    <div style={outerStyle}>
      <div style={appStyle}>

        <div style={topBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a
              href={`/distribution/${market}/driver/dashboard`}
              style={{ color: 'rgba(255,255,255,.55)', textDecoration: 'none', fontSize: 20, flexShrink: 0 }}
              title="Back to dashboard"
            >←</a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{route.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                {driverName} · {eligibleStops.length} stop{eligibleStops.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 12px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1 }}>

          {/* How-to note above the list */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
            padding: '10px 14px', marginBottom: 6, fontSize: 12, color: '#1A5FA8',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>👆</span>
            <span>Tap any stop for details, directions, history &amp; to report an issue</span>
          </div>

          {stops.map((s, i) => {
            const isPickup = s.is_pickup
            const isPaused = !isPickup && s.not_delivering
            const num = isPickup ? 'P' : (i + 1 - stops.slice(0, i).filter(x => x.is_pickup).length)
            const cardStyle: React.CSSProperties = {
              background: isPickup ? '#EFF6FF' : isPaused ? '#FFFBEB' : 'white',
              border: '1.5px solid ' + (isPickup ? '#BFDBFE' : isPaused ? '#FDE68A' : '#E2E8F0'),
              opacity: isPaused ? 0.7 : 1,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer', flexShrink: 0,
              transition: 'transform .12s ease',
            }
            return (
              <button
                key={s.id}
                onClick={() => openStop(s)}
                style={{ ...cardStyle, background: cardStyle.background, textAlign: 'left', fontFamily: 'inherit' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: isPickup ? '#1A5FA8' : '#F1F5F9',
                  color: isPickup ? 'white' : '#64748B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {num}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', lineHeight: 1.3 }}>
                    {s.name}
                    {s.is_advertiser && !isPickup && (
                      <span title="Advertiser" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>★</span>
                    )}
                  </div>
                  {s.address && (
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {s.address}{s.city ? `, ${s.city}` : ''}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {s.quantities && Object.entries(s.quantities).map(([pub, qty]) => {
                      if (!qty || isPickup) return null
                      const col = pubColor(pub)
                      return (
                        <span key={pub} style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: col.bg, color: col.fg, fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                          {pub.toUpperCase()} {qty}
                        </span>
                      )
                    })}
                    {isPickup && (
                      <span style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: '#DBEAFE', color: '#1A5FA8', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        📦 Load here
                      </span>
                    )}
                    {isPaused && (
                      <span style={{ fontSize: 14, fontWeight: 800, padding: '3px 12px', borderRadius: 12, background: '#FEF3C7', color: '#92400E', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                        ⏸ Paused
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ color: '#94A3B8', fontSize: 20, flexShrink: 0 }}>›</div>
              </button>
            )
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#1E293B', color: 'white', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 500, zIndex: 200 }}>
          {toast}
        </div>
      )}

      {sheet && (() => {
        const s = sheet.stop
        const summary = sheet.history ? summarize(sheet.history) : null
        const fullAddress = [s.address, s.city, s.zip].filter(Boolean).join(', ')
        return (
          <Sheet onClose={() => setSheet(null)} title={s.name}>
            {fullAddress && (
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 8 }}>{fullAddress}</div>
            )}
            {fullAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#1A5FA8', color: 'white', textDecoration: 'none' }}
              >
                📍 View on Map
              </a>
            )}
            {s.notes && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1A5FA8', fontStyle: 'italic' }}>
                📌 {s.notes}
              </div>
            )}

            {/* Performance summary */}
            {summary && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <SummaryPill label="Delivered" value={`${summary.delivered}/${summary.runs}`} color="#16A34A" />
                <SummaryPill label="Total leftover" value={String(summary.leftover)} color={summary.leftover > 0 ? '#B45309' : '#94A3B8'} />
              </div>
            )}

            {/* Full history */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginTop: 16, marginBottom: 8 }}>
              Your history at this stop
            </div>
            {sheet.history === null ? (
              <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 12 }}>Loading…</div>
            ) : sheet.history.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 12 }}>
                No history yet — first time here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sheet.history.map(h => {
                  const monthLbl = h.month ? new Date(h.month + '-01T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
                  const leftoverStr = h.leftovers_json && Object.keys(h.leftovers_json).length > 0
                    ? Object.entries(h.leftovers_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')
                    : (h.leftovers > 0 ? `${h.leftovers} copies` : '')
                  return (
                    <div key={h.month + h.status} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{monthLbl}</div>
                        {h.checked
                          ? <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 999 }}>Delivered</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, background: '#E2E8F0', color: '#64748B', padding: '2px 8px', borderRadius: 999 }}>Skipped</span>}
                      </div>
                      {leftoverStr && (
                        <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>📦 Leftover: {leftoverStr}</div>
                      )}
                      {h.driver_note && (
                        <div style={{ fontSize: 12, color: '#1A5FA8', marginTop: 2, fontStyle: 'italic' }}>📝 {h.driver_note}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Edit stop or report issue */}
            {!s.is_pickup && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginTop: 16, marginBottom: 8 }}>
                  Edit stop or report issue
                </div>
                {!sheet.reportOpen ? (
                  <button
                    type="button"
                    onClick={() => setSheet({ ...sheet, reportOpen: true })}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: '#EFF6FF', border: '1.5px dashed #93C5FD',
                      borderRadius: 10, fontSize: 13, fontWeight: 600,
                      color: '#1A5FA8', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ✎ Edit stop or report issue
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>What&apos;s the change?</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {CATEGORIES.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setSheet({ ...sheet, category: c.key })}
                          style={{
                            padding: '10px 8px',
                            border: '1.5px solid ' + (sheet.category === c.key ? '#0F2640' : '#E2E8F0'),
                            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: sheet.category === c.key ? '#EFF6FF' : 'white',
                            color: sheet.category === c.key ? '#0F2640' : '#64748B',
                            fontFamily: 'inherit', textAlign: 'center',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{c.icon}</span>
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Per-category form */}
                    {sheet.category === 'wrong_address' && (
                      <div style={{ marginBottom: 10 }}>
                        <FormLabel>Current address on file</FormLabel>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                          {[s.address, s.city, s.zip].filter(Boolean).join(', ') || 'None on file'}
                        </div>
                        <FormLabel>New address</FormLabel>
                        <input
                          value={sheet.addressForm.address}
                          onChange={e => setSheet({ ...sheet, addressForm: { ...sheet.addressForm, address: e.target.value } })}
                          placeholder="123 Main St"
                          style={sheetInputStyle}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
                          <input
                            value={sheet.addressForm.city}
                            onChange={e => setSheet({ ...sheet, addressForm: { ...sheet.addressForm, city: e.target.value } })}
                            placeholder="City"
                            style={sheetInputStyle}
                          />
                          <input
                            value={sheet.addressForm.zip}
                            onChange={e => setSheet({ ...sheet, addressForm: { ...sheet.addressForm, zip: e.target.value } })}
                            placeholder="Zip"
                            style={sheetInputStyle}
                          />
                        </div>
                      </div>
                    )}

                    {sheet.category === 'wrong_qty' && (
                      <div style={{ marginBottom: 10 }}>
                        <FormLabel>Change copies per publication</FormLabel>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                          {(Object.keys(sheet.qtyForm).length > 0 ? Object.keys(sheet.qtyForm).sort() : ['rrp', 'boom']).map(pub => (
                            <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
                              <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                              <input
                                type="number" min={0} inputMode="numeric"
                                value={sheet.qtyForm[pub] || ''}
                                onChange={e => setSheet({ ...sheet, qtyForm: { ...sheet.qtyForm, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) } })}
                                style={{ width: 80, padding: '8px 10px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                              />
                            </label>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          Currently: {Object.entries(s.quantities ?? {}).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') || 'none set'}
                        </div>
                      </div>
                    )}

                    {sheet.category === 'new_contact' && (
                      <div style={{ marginBottom: 10 }}>
                        <FormLabel>Contact name</FormLabel>
                        <input
                          value={sheet.contactForm.contact_name}
                          onChange={e => setSheet({ ...sheet, contactForm: { ...sheet.contactForm, contact_name: e.target.value } })}
                          placeholder="e.g. Bob Smith, Store Manager"
                          style={sheetInputStyle}
                        />
                        <FormLabel>Phone</FormLabel>
                        <input
                          value={sheet.contactForm.contact_phone}
                          onChange={e => setSheet({ ...sheet, contactForm: { ...sheet.contactForm, contact_phone: e.target.value } })}
                          placeholder="334-555-0100"
                          type="tel"
                          style={sheetInputStyle}
                        />
                        <FormLabel>Email</FormLabel>
                        <input
                          value={sheet.contactForm.contact_email}
                          onChange={e => setSheet({ ...sheet, contactForm: { ...sheet.contactForm, contact_email: e.target.value } })}
                          placeholder="bob@example.com"
                          type="email"
                          style={sheetInputStyle}
                        />
                      </div>
                    )}

                    {(sheet.category === 'closed' || sheet.category === 'new_stop' || sheet.category === 'other') && (
                      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontStyle: 'italic' }}>
                        {sheet.category === 'closed' && 'Admin will mark this location closed and stop deliveries.'}
                        {sheet.category === 'new_stop' && 'Describe the new location in the notes below.'}
                        {sheet.category === 'other' && 'Explain the issue in the notes below.'}
                      </div>
                    )}

                    {sheet.category && (
                      <>
                        <FormLabel>Notes for admin {sheet.category !== 'other' ? '(optional)' : '(required)'}</FormLabel>
                        <textarea
                          value={sheet.notes}
                          onChange={e => setSheet({ ...sheet, notes: e.target.value })}
                          placeholder={sheet.category === 'closed' ? 'When did they close? Anything to add?' : 'Extra context…'}
                          style={{ ...sheetTextareaStyle, height: 70 }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={submitChange} disabled={sheet.submitting || !sheet.category} style={sheetSaveStyle}>
                            {sheet.submitting ? 'Sending…' : 'Send for approval'}
                          </button>
                          <button onClick={() => setSheet({ ...sheet, reportOpen: false, category: null })} style={sheetCancelStyle}>Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setSheet(null)} style={{ ...sheetSaveStyle, background: '#F1F5F9', color: '#1E293B' }}>Close</button>
            </div>
          </Sheet>
        )
      })()}
    </div>
  )
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B', marginBottom: 4, marginTop: 8 }}>
      {children}
    </div>
  )
}

function SummaryPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#94A3B8' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: '"DM Mono", ui-monospace, monospace', marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ── Sheet primitive ──────────────────────────────────────────────────
function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 32px', width: '100%', maxWidth: 480,
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: '#E2E8F0', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: '#1E293B' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

// Styles
const outerStyle: React.CSSProperties = {
  fontFamily: '"DM Sans", -apple-system, system-ui, sans-serif',
  background: '#F1F5F9',
  color: '#1E293B',
  minHeight: '100vh',
  display: 'flex',
}
const appStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  minHeight: '100vh', width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  background: '#F1F5F9',
}
const topBarStyle: React.CSSProperties = {
  background: '#0F2640', padding: '14px 16px 12px', flexShrink: 0,
}
const sheetTextareaStyle: React.CSSProperties = {
  width: '100%', padding: 12, border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 15, fontFamily: 'inherit', resize: 'none', height: 90, color: '#1E293B',
}
const sheetInputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', marginBottom: 10, color: '#1E293B',
}
const sheetSaveStyle: React.CSSProperties = {
  flex: 1, padding: 13, background: '#0F2640', color: 'white', border: 'none', borderRadius: 10,
  fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
const sheetCancelStyle: React.CSSProperties = {
  padding: '13px 18px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 10,
  fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
}
