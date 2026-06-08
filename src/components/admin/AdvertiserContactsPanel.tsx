'use client'

// AdvertiserContactsPanel — replaces the single-contact display on the
// advertiser profile page. Lists every advertiser_contacts row for the
// account, shows role + primary badge, lets the editor add / edit /
// delete contacts inline.
//
// Server-fetched initial list comes in as a prop. All mutations go
// through /api/admin/advertiser-contacts; on success we refresh the
// route so the parent page re-fetches contracts, ad placements, etc.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Phone, Star, Plus, Pencil, Trash2, X, Check, RefreshCw, Briefcase } from 'lucide-react'

export type ContactRole = 'ad_rep' | 'billing' | 'listing_owner' | 'decision_maker' | 'other'

export interface AdvertiserContact {
  id:                    string
  advertiser_account_id: string
  name:                  string
  email:                 string | null
  phone:                 string | null
  role:                  ContactRole
  is_primary:            boolean
  notes:                 string | null
}

interface Props {
  advertiserId: string
  initial:      AdvertiserContact[]
}

// Role metadata — labels for display, badge color so the editor scans
// roles by hue. Kept tiny and on-brand (no flashy colors); the badge is
// information, not decoration.
const ROLE_META: Record<ContactRole, { label: string; cls: string }> = {
  ad_rep:         { label: 'Ad rep',         cls: 'bg-portal-amber-lt text-portal-amber ring-amber-200' },
  billing:        { label: 'Billing',        cls: 'bg-portal-green-lt text-portal-green ring-emerald-200' },
  listing_owner:  { label: 'Listing owner',  cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
  decision_maker: { label: 'Decision maker', cls: 'bg-violet-100 text-violet-800 ring-violet-200' },
  other:          { label: 'Other',          cls: 'bg-gray-100 text-portal-text ring-gray-200' },
}

const ROLE_OPTIONS: Array<{ value: ContactRole; label: string }> = [
  { value: 'ad_rep',         label: 'Ad rep — day-to-day sales' },
  { value: 'billing',        label: 'Billing — invoices + payments' },
  { value: 'listing_owner',  label: 'Listing owner — guide edits' },
  { value: 'decision_maker', label: 'Decision maker — owner / GM' },
  { value: 'other',          label: 'Other' },
]

export function AdvertiserContactsPanel({ advertiserId, initial }: Props) {
  const router = useRouter()
  const [contacts, setContacts] = useState<AdvertiserContact[]>(initial)
  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [busy,     startTransition] = useTransition()

  function refreshAfter(next: AdvertiserContact[]) {
    setContacts(next)
    router.refresh()  // re-runs server queries on the parent page
  }

  async function onCreate(form: ContactFormShape) {
    const res = await fetch('/api/admin/advertiser-contacts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ advertiser_account_id: advertiserId, ...form }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.contact) { window.alert(json?.error ?? `HTTP ${res.status}`); return false }
    // If the new contact is primary, every other contact lost its primary
    // flag server-side — reflect that locally too.
    let next = contacts
    if (form.is_primary) next = next.map(c => ({ ...c, is_primary: false }))
    next = [...next, json.contact as AdvertiserContact]
    refreshAfter(next)
    return true
  }

  async function onSave(id: string, form: ContactFormShape) {
    const res = await fetch(`/api/admin/advertiser-contacts/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.contact) { window.alert(json?.error ?? `HTTP ${res.status}`); return false }
    let next = contacts.map(c => c.id === id ? json.contact as AdvertiserContact : c)
    if (form.is_primary) next = next.map(c => c.id === id ? c : { ...c, is_primary: false })
    refreshAfter(next)
    return true
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}?`)) return
    const res = await fetch(`/api/admin/advertiser-contacts/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      window.alert(json?.error ?? `HTTP ${res.status}`)
      return
    }
    refreshAfter(contacts.filter(c => c.id !== id))
  }

  return (
    <section className="bg-white rounded-xl ring-1 ring-gray-200 p-5 space-y-3 text-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub">
          Contacts {contacts.length > 0 && <span className="text-portal-muted">({contacts.length})</span>}
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditing(null) }}
            className="inline-flex items-center gap-1 text-xs font-bold text-portal-blue hover:underline"
          >
            <Plus size={11} /> Add
          </button>
        )}
      </header>

      {/* Empty state — nudge the editor to add the first contact instead
          of showing a void. Picks up automatically when the first one
          is saved. */}
      {contacts.length === 0 && !adding && (
        <div className="text-center py-4 border border-dashed border-portal-border rounded-lg">
          <p className="text-xs text-portal-sub mb-2">No contacts yet.</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-bold text-portal-blue hover:underline"
          >
            Add the first one →
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {contacts.map(c => (
          editing === c.id ? (
            <li key={c.id}>
              <ContactForm
                initial={c}
                onCancel={() => setEditing(null)}
                onSubmit={async form => {
                  const ok = await onSave(c.id, form)
                  if (ok) setEditing(null)
                }}
              />
            </li>
          ) : (
            <li key={c.id} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-portal-bg transition-colors group">
              <Briefcase size={13} className="text-gray-300 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className="font-bold text-portal-text leading-tight">{c.name}</p>
                  {c.is_primary && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-portal-amber">
                      <Star size={9} className="fill-amber-500 text-amber-500" /> Primary
                    </span>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ${ROLE_META[c.role].cls}`}>
                    {ROLE_META[c.role].label}
                  </span>
                </div>
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-portal-blue hover:underline text-xs mt-0.5">
                    <Mail size={11} /> {c.email}
                  </a>
                )}
                {c.phone && (
                  <p className="flex items-center gap-1 text-portal-sub text-xs mt-0.5">
                    <Phone size={11} /> {c.phone}
                  </p>
                )}
                {c.notes && <p className="text-[11px] text-portal-sub italic mt-0.5">{c.notes}</p>}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => { setEditing(c.id); setAdding(false) }}
                  className="p-1 rounded hover:bg-gray-200 text-portal-sub hover:text-portal-text"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => startTransition(() => { void onDelete(c.id, c.name) })}
                  disabled={busy}
                  className="p-1 rounded hover:bg-portal-red-lt text-portal-muted hover:text-rose-600 disabled:opacity-40"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </li>
          )
        ))}
      </ul>

      {adding && (
        <ContactForm
          initial={null}
          onCancel={() => setAdding(false)}
          onSubmit={async form => {
            const ok = await onCreate(form)
            if (ok) setAdding(false)
          }}
        />
      )}
    </section>
  )
}

// ── Inline form for add + edit ───────────────────────────────────────────────

interface ContactFormShape {
  name:       string
  email:      string | null
  phone:      string | null
  role:       ContactRole
  is_primary: boolean
  notes:      string | null
}

function ContactForm({
  initial, onCancel, onSubmit,
}: {
  initial:  AdvertiserContact | null
  onCancel: () => void
  onSubmit: (form: ContactFormShape) => Promise<void>
}) {
  const [name,   setName]   = useState(initial?.name   ?? '')
  const [email,  setEmail]  = useState(initial?.email  ?? '')
  const [phone,  setPhone]  = useState(initial?.phone  ?? '')
  const [role,   setRole]   = useState<ContactRole>((initial?.role ?? 'ad_rep') as ContactRole)
  const [isPrimary, setIsPrimary] = useState(initial?.is_primary ?? false)
  const [notes,  setNotes]  = useState(initial?.notes  ?? '')
  const [saving, setSaving] = useState(false)

  const inp = 'w-full text-sm border border-portal-border rounded-lg px-3 py-2 outline-none focus:border-portal-blue'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        name:       name.trim(),
        email:      email.trim()  || null,
        phone:      phone.trim()  || null,
        role,
        is_primary: isPrimary,
        notes:      notes.trim()  || null,
      })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="bg-portal-bg border border-portal-border rounded-lg p-3 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="Tommy McKinnon" className={inp} />
        </div>
        <div>
          <label className={lbl}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value as ContactRole)} className={`${inp} cursor-pointer`}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className={lbl}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@business.com" className={inp} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="334-555-1234" className={inp} />
        </div>
      </div>
      <div>
        <label className={lbl}>Notes (optional)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Best to reach after 3pm" className={inp} />
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-portal-text">
          <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
          Mark as primary contact
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-portal-sub hover:text-portal-text">
            <X size={11} className="inline mr-0.5" /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
          >
            {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
