'use client'

// OrganizationsAdminClient — the Community Connections directory.
// Searchable list of partner orgs (churches, libraries, nonprofits, etc.)
// with inline add + edit, kind filter, status tabs (Active / Archived).

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, ChevronLeft, RefreshCw, Trash2, Pencil, ExternalLink,
  CheckCircle2, X, Building2, MapPin, Mail, Phone, RotateCcw,
} from 'lucide-react'
import type { CommunityOrganization, SourceOption } from './page'

const KINDS = [
  { slug: 'community',  label: 'Community group' },
  { slug: 'church',     label: 'Church / Faith' },
  { slug: 'library',    label: 'Library' },
  { slug: 'museum',     label: 'Museum' },
  { slug: 'nonprofit',  label: 'Nonprofit' },
  { slug: 'school',     label: 'School' },
  { slug: 'business',   label: 'Local business' },
  { slug: 'government', label: 'Government' },
] as const

function kindLabel(slug: string): string {
  return KINDS.find(k => k.slug === slug)?.label ?? slug
}

interface Props {
  initialOrgs: CommunityOrganization[]
  sources:     SourceOption[]
}

type Tab = 'active' | 'archived'

export function OrganizationsAdminClient({ initialOrgs, sources }: Props) {
  const router = useRouter()
  const [orgs,     setOrgs]     = useState<CommunityOrganization[]>(initialOrgs)
  const [tab,      setTab]      = useState<Tab>('active')
  const [search,   setSearch]   = useState('')
  const [kind,     setKind]     = useState('')
  const [addOpen,  setAddOpen]  = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const counts = useMemo(() => ({
    active:   orgs.filter(o => o.status === 'active').length,
    archived: orgs.filter(o => o.status === 'archived').length,
  }), [orgs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orgs.filter(o => {
      if (tab === 'active'   && o.status !== 'active')   return false
      if (tab === 'archived' && o.status !== 'archived') return false
      if (kind && o.kind !== kind) return false
      if (q && !(
        o.name.toLowerCase().includes(q) ||
        (o.description ?? '').toLowerCase().includes(q) ||
        (o.city ?? '').toLowerCase().includes(q) ||
        (o.contact_email ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [orgs, tab, kind, search])

  function handleCreated(org: CommunityOrganization) {
    setOrgs(prev => [org, ...prev])
    setAddOpen(false)
    router.refresh()
  }
  function handleUpdated(id: string, patch: Partial<CommunityOrganization>) {
    setOrgs(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
    router.refresh()
  }
  function handleRemoved(id: string) {
    setOrgs(prev => prev.filter(o => o.id !== id))
    setEditingId(curr => curr === id ? null : curr)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/events" className="text-portal-sub hover:text-portal-text inline-flex items-center gap-1 text-sm">
            <ChevronLeft size={14} /> Events
          </Link>
          <span className="text-portal-border-2">/</span>
          <h1 className="text-xl font-semibold text-portal-text inline-flex items-center gap-2">
            <Building2 size={18} className="text-portal-blue" /> Community Connections
          </h1>
          <span className="text-xs text-portal-sub">
            The partners behind our event calendar
          </span>
        </div>
        <button
          onClick={() => setAddOpen(v => !v)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:bg-portal-navy/90"
        >
          <Plus size={14} /> Add Organization
        </button>
      </div>

      {addOpen && (
        <OrgForm
          sources={sources}
          onCancel={() => setAddOpen(false)}
          onSaved={handleCreated}
          mode="create"
        />
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-portal-border px-6 shrink-0">
        <div className="flex items-center gap-1">
          {([
            ['active',   'Active',   counts.active],
            ['archived', 'Archived', counts.archived],
          ] as const).map(([slug, label, count]) => (
            <button
              key={slug}
              onClick={() => setTab(slug)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === slug ? 'text-portal-blue border-portal-blue' : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${
                tab === slug ? 'bg-portal-blue-lt text-portal-blue ring-portal-blue/20' : 'bg-portal-bg text-portal-muted border-portal-border'
              }`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center gap-3 flex-wrap text-sm">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-portal-muted pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, city, contact…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none focus:border-portal-blue"
          />
        </div>
        <select
          value={kind}
          onChange={e => setKind(e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-portal-border rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue"
        >
          <option value="">All kinds</option>
          {KINDS.map(k => (
            <option key={k.slug} value={k.slug}>{k.label}</option>
          ))}
        </select>
        {(search || kind) && (
          <button type="button" onClick={() => { setSearch(''); setKind('') }} className="text-xs text-portal-sub hover:text-portal-text underline">
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-portal-sub">
          {filtered.length} {filtered.length === 1 ? 'organization' : 'organizations'}
        </span>
      </div>

      {/* List */}
      <div className="bg-portal-bg px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-portal-muted bg-white rounded-lg border border-portal-border">
            <Building2 size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No organizations match the current filter</p>
            {orgs.length === 0 && (
              <button
                onClick={() => setAddOpen(true)}
                className="mt-3 text-xs font-semibold text-portal-blue hover:underline"
              >
                Add the first one →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-portal-border divide-y divide-portal-border overflow-hidden">
            {filtered.map(org => (
              <OrgRow
                key={org.id}
                org={org}
                sources={sources}
                editing={editingId === org.id}
                onEdit={() => setEditingId(org.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={(patch) => handleUpdated(org.id, patch)}
                onRemoved={() => handleRemoved(org.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Org row ──────────────────────────────────────────────────────────────────

function OrgRow({
  org, sources, editing, onEdit, onCancelEdit, onUpdated, onRemoved,
}: {
  org:          CommunityOrganization
  sources:      SourceOption[]
  editing:      boolean
  onEdit:       () => void
  onCancelEdit: () => void
  onUpdated:    (patch: Partial<CommunityOrganization>) => void
  onRemoved:    () => void
}) {
  const [busy, setBusy] = useState<'archive' | 'reopen' | 'delete' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function setStatus(status: 'active' | 'archived') {
    setBusy(status === 'archived' ? 'archive' : 'reopen'); setErr(null)
    try {
      const res = await fetch(`/api/admin/events/organizations/${org.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'edit', status }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onUpdated({ status })
    } finally { setBusy(null) }
  }

  async function remove() {
    if (!confirm(`Delete "${org.name}"? (Soft delete — recoverable from trash)`)) return
    setBusy('delete'); setErr(null)
    try {
      const res = await fetch(`/api/admin/events/organizations/${org.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onRemoved()
    } finally { setBusy(null) }
  }

  return (
    <div className="bg-white hover:bg-portal-bg/60 transition-colors">
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Logo */}
        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-portal-row-hover border border-portal-border flex items-center justify-center">
          {org.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Building2 size={20} className="text-portal-border-2" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text truncate">{org.name}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-portal-bg text-portal-sub border border-portal-border">
              {kindLabel(org.kind)}
            </span>
            {org.tags?.includes('preferred') && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-portal-amber-lt text-portal-amber border border-portal-amber/30">
                Preferred
              </span>
            )}
            {org.source_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-portal-blue-lt text-portal-blue border border-portal-blue/30">
                Linked to feed
              </span>
            )}
          </div>
          {org.description && (
            <p className="text-xs text-portal-sub leading-snug line-clamp-2 mb-1.5">{org.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-portal-sub">
            {org.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {org.city}
              </span>
            )}
            {org.contact_email && (
              <a href={`mailto:${org.contact_email}`} className="inline-flex items-center gap-1 hover:text-portal-text">
                <Mail size={11} /> {org.contact_email}
              </a>
            )}
            {org.contact_phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={11} /> {org.contact_phone}
              </span>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-portal-blue hover:underline">
                <ExternalLink size={11} /> Website
              </a>
            )}
          </div>
          {err && <p className="text-xs text-portal-red font-semibold mt-1">{err}</p>}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {org.status === 'active' ? (
            <button
              onClick={() => setStatus('archived')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-portal-sub bg-white border border-portal-border rounded-lg hover:bg-portal-bg disabled:opacity-40"
            >
              {busy === 'archive' ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
              Archive
            </button>
          ) : (
            <button
              onClick={() => setStatus('active')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-portal-text bg-white border border-portal-border rounded-lg hover:bg-portal-bg disabled:opacity-40"
            >
              {busy === 'reopen' ? <RefreshCw size={11} className="animate-spin" /> : <RotateCcw size={11} />}
              Reactivate
            </button>
          )}
          <button
            onClick={editing ? onCancelEdit : onEdit}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-portal-text bg-white border border-portal-border rounded-lg hover:bg-portal-bg"
          >
            <Pencil size={11} />
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={remove}
            disabled={busy !== null}
            className="p-1 text-portal-muted hover:text-portal-red rounded-lg hover:bg-portal-red-lt disabled:opacity-40"
            aria-label="Delete"
          >
            {busy === 'delete' ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {editing && (
        <OrgForm
          mode="edit"
          org={org}
          sources={sources}
          onCancel={onCancelEdit}
          onSaved={(patch) => { onUpdated(patch); onCancelEdit() }}
        />
      )}
    </div>
  )
}

// ── Add / Edit form ──────────────────────────────────────────────────────────

function OrgForm({
  mode, org, sources, onCancel, onSaved,
}: {
  mode:    'create' | 'edit'
  org?:    CommunityOrganization
  sources: SourceOption[]
  onCancel: () => void
  onSaved:  (org: CommunityOrganization) => void
}) {
  const [name,     setName]     = useState(org?.name ?? '')
  const [kind,     setKind]     = useState(org?.kind ?? 'community')
  const [description, setDescription] = useState(org?.description ?? '')
  const [logoUrl,  setLogoUrl]  = useState(org?.logo_url ?? '')
  const [website,  setWebsite]  = useState(org?.website ?? '')
  const [contactName,  setContactName]  = useState(org?.contact_name ?? '')
  const [contactEmail, setContactEmail] = useState(org?.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(org?.contact_phone ?? '')
  const [address,  setAddress]  = useState(org?.address ?? '')
  const [city,     setCity]     = useState(org?.city ?? '')
  const [fbUrl,    setFbUrl]    = useState(org?.social_facebook ?? '')
  const [igUrl,    setIgUrl]    = useState(org?.social_instagram ?? '')
  const [preferred, setPreferred] = useState(org?.tags?.includes('preferred') ?? false)
  const [notes,    setNotes]    = useState(org?.notes ?? '')
  const [sourceId, setSourceId] = useState(org?.source_id ?? '')

  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!name.trim()) { setErr('Name is required'); return }

    setBusy(true)
    try {
      const tags = preferred ? ['preferred'] : []
      const payload = {
        action:           'edit',
        name:             name.trim(),
        kind,
        description:      description.trim() || null,
        logo_url:         logoUrl.trim() || null,
        website:          website.trim() || null,
        contact_name:     contactName.trim() || null,
        contact_email:    contactEmail.trim() || null,
        contact_phone:    contactPhone.trim() || null,
        address:          address.trim() || null,
        city:             city.trim() || null,
        social_facebook:  fbUrl.trim() || null,
        social_instagram: igUrl.trim() || null,
        tags,
        notes:            notes.trim() || null,
        source_id:        sourceId || null,
      }
      const res = await fetch(
        mode === 'create'
          ? '/api/admin/events/organizations'
          : `/api/admin/events/organizations/${org!.id}`,
        {
          method:  mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(mode === 'create' ? { ...payload, action: 'create' } : payload),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onSaved(mode === 'create' ? (json.org as CommunityOrganization) : { ...(org as CommunityOrganization), ...payload, tags } as CommunityOrganization)
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full text-sm border border-portal-blue/30 rounded-lg px-3 py-2 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-blue mb-1'

  return (
    <form onSubmit={submit} className="bg-portal-blue-lt/40 border-t border-portal-blue/20 px-4 py-4">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={lbl}>Name <span className="text-portal-red">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus className={`${inp} font-semibold`} />
        </div>
        <div>
          <label className={lbl}>Kind</label>
          <select value={kind} onChange={e => setKind(e.target.value)} className={`${inp} cursor-pointer`}>
            {KINDS.map(k => (
              <option key={k.slug} value={k.slug}>{k.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 md:col-span-3">
          <label className={lbl}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className={`${inp} resize-y`}
            placeholder="One-line description shown on the public directory later."
          />
        </div>

        <div>
          <label className={lbl}>Logo URL</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className={inp} placeholder="https://..." />
        </div>
        <div>
          <label className={lbl}>Website</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} className={inp} placeholder="https://..." />
        </div>
        <div>
          <label className={lbl}>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} className={inp} />
        </div>

        <div className="sm:col-span-2 md:col-span-3">
          <label className={lbl}>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className={inp} />
        </div>

        <div>
          <label className={lbl}>Contact name</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Contact email</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Contact phone</label>
          <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={inp} />
        </div>

        <div>
          <label className={lbl}>Facebook</label>
          <input value={fbUrl} onChange={e => setFbUrl(e.target.value)} className={inp} placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className={lbl}>Instagram</label>
          <input value={igUrl} onChange={e => setIgUrl(e.target.value)} className={inp} placeholder="https://instagram.com/..." />
        </div>
        <div>
          <label className={lbl}>Linked iCal source</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— None —</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 md:col-span-3">
          <label className={lbl}>Internal notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className={`${inp} resize-y text-xs`}
            placeholder="Reminders for staff — never shown publicly."
          />
        </div>

        <label className="sm:col-span-2 md:col-span-3 inline-flex items-center gap-2 text-xs text-portal-navy cursor-pointer">
          <input type="checkbox" checked={preferred} onChange={e => setPreferred(e.target.checked)} className="rounded" />
          Mark as a <strong>Preferred Partner</strong> (highlighted across the calendar)
        </label>
      </div>

      {err && <p className="text-xs text-portal-red font-semibold mt-3">{err}</p>}

      <div className="flex items-center gap-2 pt-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {busy ? 'Saving…' : (mode === 'create' ? 'Add organization' : 'Save changes')}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-portal-blue hover:text-portal-navy">
          Cancel
        </button>
      </div>
    </form>
  )
}
