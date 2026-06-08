'use client'

// AdminUsersClient — staff directory + editor.
// Three rendered states per row: view (default), inline edit, deny (for
// rows the current user can't manage — greyed out with a tooltip).
// Quick add lives in a header panel that mirrors the events Quick Add UX.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, RefreshCw, Shield, ShieldCheck, Pencil, Trash2, Mail,
  CheckCircle2, X, ChevronDown, AlertTriangle, Send, KeyRound,
} from 'lucide-react'
import { MARKETS, marketShort, marketDisplayName } from '@/lib/markets'
import {
  canCreateAdminRole, canManageAdminRow, canAssignRole, canDeleteSelf,
} from '@/lib/admin/permissions'
import type { AdminUserRow } from './page'

type AdminRole = 'super' | 'admin' | 'publisher' | 'editor'

interface CurrentUser {
  id:   string
  role: AdminRole
}

interface Props {
  initialRows: AdminUserRow[]
  currentUser: CurrentUser
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super:     'Super Admin',
  admin:     'Admin',
  publisher: 'Publisher',
  editor:    'Editor',
}
const ROLE_BADGE: Record<AdminRole, string> = {
  super:     'bg-portal-amber-lt text-portal-amber ring-amber-200',
  admin:     'bg-violet-100 text-violet-800 ring-violet-200',
  publisher: 'bg-sky-100 text-sky-800 ring-sky-200',
  editor:    'bg-gray-100 text-gray-700 ring-gray-200',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = Date.now()
  const days = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminUsersClient({ initialRows, currentUser }: Props) {
  const router = useRouter()
  const [rows,     setRows]     = useState<AdminUserRow[]>(initialRows)
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'suspended' | 'all'>('active')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const counts = useMemo(() => ({
    total:     rows.length,
    super:     rows.filter(r => r.role === 'super'     && r.status === 'active').length,
    admin:     rows.filter(r => r.role === 'admin'     && r.status === 'active').length,
    publisher: rows.filter(r => r.role === 'publisher' && r.status === 'active').length,
    editor:    rows.filter(r => r.role === 'editor'    && r.status === 'active').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (roleFilter   !== 'all' && r.role   !== roleFilter)   return false
      if (q && !(
        r.email.toLowerCase().includes(q) ||
        (r.full_name ?? '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [rows, search, roleFilter, statusFilter])

  function onCreated(row: AdminUserRow) {
    setRows(prev => [row, ...prev])
    setInviteOpen(false)
    router.refresh()
  }
  function onUpdated(id: string, patch: Partial<AdminUserRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    router.refresh()
  }
  function onRemoved(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    setEditingId(curr => curr === id ? null : curr)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900 inline-flex items-center gap-2">
            <Shield size={18} className="text-portal-blue" /> Admin Users
          </h1>
          <span className="text-xs text-gray-500">
            Staff who can sign into the admin
          </span>
        </div>
        <button
          onClick={() => setInviteOpen(v => !v)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-portal-navy rounded-lg hover:bg-portal-navy/90"
        >
          <Plus size={14} /> Invite Admin
        </button>
      </div>

      {/* Stat strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        <StatChip label="Super Admin" count={counts.super}     accent="amber" />
        <StatChip label="Admin"       count={counts.admin}     accent="violet" />
        <StatChip label="Publisher"   count={counts.publisher} accent="sky" />
        <StatChip label="Editor"      count={counts.editor}    accent="gray" />
        {counts.suspended > 0 && (
          <StatChip label="Suspended"   count={counts.suspended} accent="rose" />
        )}
        <span className="ml-auto text-[11px] text-gray-500">
          {counts.total} {counts.total === 1 ? 'total account' : 'total accounts'}
        </span>
      </div>

      {inviteOpen && (
        <InvitePanel
          currentUserRole={currentUser.role}
          onCancel={() => setInviteOpen(false)}
          onCreated={onCreated}
        />
      )}

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap text-sm">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-portal-blue"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as 'all' | AdminRole)}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue"
        >
          <option value="all">All roles</option>
          <option value="super">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="publisher">Publisher</option>
          <option value="editor">Editor</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'active' | 'suspended' | 'all')}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-portal-bg px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Shield size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No admins match the current filter</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {filtered.map(row => (
              <AdminRowItem
                key={row.id}
                row={row}
                currentUser={currentUser}
                editing={editingId === row.id}
                onEdit={() => setEditingId(row.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdated={(patch) => onUpdated(row.id, patch)}
                onRemoved={() => onRemoved(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, count, accent }: { label: string; count: number; accent: 'amber' | 'violet' | 'sky' | 'gray' | 'rose' }) {
  const bg: Record<typeof accent, string> = {
    amber:  'bg-portal-amber-lt text-portal-amber ring-amber-200',
    violet: 'bg-violet-50 text-violet-800 ring-violet-200',
    sky:    'bg-sky-50 text-sky-800 ring-sky-200',
    gray:   'bg-gray-50 text-gray-700 ring-gray-200',
    rose:   'bg-portal-red-lt text-portal-red ring-rose-200',
  }
  return (
    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ring-1 ${bg[accent]} inline-flex items-center gap-1.5`}>
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </span>
  )
}

// ── Invite panel ─────────────────────────────────────────────────────────────

function InvitePanel({
  currentUserRole, onCancel, onCreated,
}: {
  currentUserRole: AdminRole
  onCancel:        () => void
  onCreated:       (row: AdminUserRow) => void
}) {
  const [email,    setEmail]    = useState('')
  const [fullName, setFullName] = useState('')
  const [role,     setRole]     = useState<AdminRole>('editor')
  const [markets,  setMarkets]  = useState<Set<string>>(new Set())
  const [sendLink, setSendLink] = useState(true)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  const isCrossBrand = role === 'super' || role === 'admin'
  const roleDecision = canCreateAdminRole(currentUserRole, role)

  function toggleMarket(slug: string) {
    setMarkets(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug); else next.add(slug)
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!email.trim()) { setErr('Email is required'); return }
    if (!roleDecision.allowed) { setErr(roleDecision.reason); return }
    if (!isCrossBrand && markets.size === 0) {
      setErr('Pick at least one market for this user'); return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:           email.trim(),
          full_name:       fullName.trim() || null,
          role,
          allowed_markets: isCrossBrand ? [] : Array.from(markets),
          send_invite:     sendLink,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onCreated(json.user as AdminUserRow)
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-blue mb-1'

  return (
    <form onSubmit={submit} className="bg-portal-blue-lt/40 border-b border-portal-blue/20 px-6 py-5">
      <h2 className="text-sm font-bold text-blue-900 inline-flex items-center gap-2 mb-4">
        <ShieldCheck size={14} /> Invite a new admin
      </h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <label className={lbl}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className={inp} placeholder="Jane Smith" />
        </div>
        <div>
          <label className={lbl}>Email <span className="text-rose-600">*</span></label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="jane@example.com" />
        </div>
        <div>
          <label className={lbl}>Role <span className="text-rose-600">*</span></label>
          <select value={role} onChange={e => setRole(e.target.value as AdminRole)} className={`${inp} cursor-pointer`}>
            {currentUserRole === 'super' && <option value="super">Super Admin</option>}
            {currentUserRole === 'super' && <option value="admin">Admin</option>}
            <option value="publisher">Publisher</option>
            <option value="editor">Editor</option>
          </select>
        </div>
      </div>

      {!isCrossBrand && (
        <div className="mt-3">
          <p className={lbl}>Markets <span className="text-rose-600">*</span></p>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map(m => {
              const on = markets.has(m.slug)
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => toggleMarket(m.slug)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold ring-1 transition-colors ${
                    on
                      ? 'bg-portal-navy text-white ring-blue-600'
                      : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m.short} <span className="opacity-70">· {m.displayName}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">
            {role === 'publisher' ? 'Publishers' : 'Editors'} only see content for the markets you select.
          </p>
        </div>
      )}

      {isCrossBrand && (
        <p className="mt-3 text-xs text-blue-900 bg-portal-blue-lt/50 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <ShieldCheck size={12} /> {ROLE_LABELS[role]}s have access to every brand.
        </p>
      )}

      <label className="mt-3 inline-flex items-center gap-2 text-xs text-blue-900 cursor-pointer">
        <input
          type="checkbox"
          checked={sendLink}
          onChange={e => setSendLink(e.target.checked)}
          className="rounded"
        />
        Email a magic-link sign-in to <strong>{email || 'this address'}</strong> now
      </label>

      {!roleDecision.allowed && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-portal-red font-semibold bg-portal-red-lt ring-1 ring-rose-200 rounded-lg px-2.5 py-1">
          <AlertTriangle size={11} /> {roleDecision.reason}
        </p>
      )}
      {err && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-portal-red font-semibold bg-portal-red-lt ring-1 ring-rose-200 rounded-lg px-2.5 py-1">
          <AlertTriangle size={11} /> {err}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !roleDecision.allowed}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
          {busy ? 'Inviting…' : 'Create + invite'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-portal-blue hover:text-blue-950">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Admin row ────────────────────────────────────────────────────────────────

function AdminRowItem({
  row, currentUser, editing, onEdit, onCancelEdit, onUpdated, onRemoved,
}: {
  row:          AdminUserRow
  currentUser:  CurrentUser
  editing:      boolean
  onEdit:       () => void
  onCancelEdit: () => void
  onUpdated:    (patch: Partial<AdminUserRow>) => void
  onRemoved:    () => void
}) {
  const isSelf  = row.id === currentUser.id
  const manage  = canManageAdminRow(currentUser.role, row.role, isSelf)
  const [busy, setBusy] = useState<'suspend' | 'restore' | 'delete' | 'resend' | null>(null)
  const [err,  setErr]  = useState<string | null>(null)

  async function patchRow(body: Record<string, unknown>): Promise<boolean> {
    setErr(null)
    const res = await fetch(`/api/admin/users/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return false }
    return true
  }

  async function setStatus(status: 'active' | 'suspended') {
    setBusy(status === 'active' ? 'restore' : 'suspend')
    try {
      if (await patchRow({ status })) onUpdated({ status })
    } finally { setBusy(null) }
  }
  async function resendInvite() {
    setBusy('resend')
    try {
      const res = await fetch(`/api/admin/users/${row.id}/resend-invite`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setErr(json?.error ?? `HTTP ${res.status}`)
      else setErr(null)
    } finally { setBusy(null) }
  }
  async function remove() {
    if (isSelf && !canDeleteSelf()) { setErr('You cannot delete your own account.'); return }
    if (!confirm(`Permanently delete ${row.email}? They will lose admin access immediately.`)) return
    setBusy('delete')
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onRemoved()
    } finally { setBusy(null) }
  }

  const isCrossBrand   = row.role === 'super' || row.role === 'admin'
  const marketsDisplay = isCrossBrand
    ? 'All brands'
    : (row.allowed_markets ?? []).length === 0
      ? <span className="text-rose-600 font-semibold">No markets assigned</span>
      : (row.allowed_markets ?? []).map(m => marketShort(m)).join(', ')

  return (
    <div className={`transition-colors ${row.status === 'suspended' ? 'bg-gray-50/60 opacity-70' : 'bg-white hover:bg-gray-50/60'}`}>
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 ring-1 ring-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
          {(row.full_name || row.email).slice(0, 1).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {row.full_name || row.email.split('@')[0]}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${ROLE_BADGE[row.role]}`}>
              {ROLE_LABELS[row.role]}
            </span>
            {isSelf && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-portal-green-lt text-portal-green ring-1 ring-emerald-200">
                You
              </span>
            )}
            {row.status === 'suspended' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-portal-red-lt text-portal-red ring-1 ring-rose-200">
                Suspended
              </span>
            )}
            {!row.user_id && row.status === 'active' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-portal-amber-lt text-portal-amber ring-1 ring-amber-200">
                Invited · pending first login
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Mail size={11} /> {row.email}
            </span>
            <span>
              <span className="text-gray-400">Markets:</span>{' '}
              <span className="font-semibold text-gray-700">{marketsDisplay}</span>
            </span>
            <span>
              <span className="text-gray-400">Last seen:</span>{' '}
              <span className="font-semibold text-gray-700">{fmtDate(row.last_login_at)}</span>
            </span>
          </div>
          {err && <p className="text-xs text-portal-red font-semibold mt-1">{err}</p>}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1.5 pt-1">
          {manage.allowed ? (
            <>
              {!row.user_id && row.status === 'active' && (
                <button
                  onClick={resendInvite}
                  disabled={busy !== null}
                  title="Re-send sign-in link"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-portal-blue bg-portal-blue-lt border border-blue-200 rounded-lg hover:bg-portal-blue-lt disabled:opacity-40"
                >
                  {busy === 'resend' ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                  Resend
                </button>
              )}
              {row.status === 'active' ? (
                <button
                  onClick={() => setStatus('suspended')}
                  disabled={busy !== null || isSelf}
                  title={isSelf ? "You can't suspend yourself" : 'Suspend admin access'}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  {busy === 'suspend' ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => setStatus('active')}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 text-portal-green bg-portal-green-lt border border-emerald-200 rounded-lg hover:bg-portal-green-lt disabled:opacity-40"
                >
                  {busy === 'restore' ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  Restore
                </button>
              )}
              <button
                onClick={editing ? onCancelEdit : onEdit}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Pencil size={11} />
                {editing ? 'Close' : 'Edit'}
              </button>
              <button
                onClick={remove}
                disabled={busy !== null || isSelf}
                title={isSelf ? "You can't delete yourself" : 'Delete admin'}
                className="p-1 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-portal-red-lt disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
              >
                {busy === 'delete' ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </>
          ) : (
            <span
              className="text-[11px] text-gray-400 italic px-2"
              title={manage.reason}
            >
              Locked
            </span>
          )}
        </div>
      </div>

      {editing && manage.allowed && (
        <EditRowPanel
          row={row}
          currentUserRole={currentUser.role}
          isSelf={isSelf}
          onCancel={onCancelEdit}
          onSaved={(patch) => { onUpdated(patch); onCancelEdit() }}
        />
      )}
    </div>
  )
}

// ── Edit panel ───────────────────────────────────────────────────────────────

function EditRowPanel({
  row, currentUserRole, isSelf, onCancel, onSaved,
}: {
  row:             AdminUserRow
  currentUserRole: AdminRole
  isSelf:          boolean
  onCancel:        () => void
  onSaved:         (patch: Partial<AdminUserRow>) => void
}) {
  const [fullName, setFullName] = useState(row.full_name ?? '')
  const [role,     setRole]     = useState<AdminRole>(row.role)
  const [markets,  setMarkets]  = useState<Set<string>>(new Set(row.allowed_markets ?? []))
  const [notes,    setNotes]    = useState(row.notes ?? '')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  const isCrossBrand   = role === 'super' || role === 'admin'
  const roleDecision   = canAssignRole(currentUserRole, role)
  const roleLocked     = isSelf // Self-edits can't change own role
  const targetRoleOpts = roleLocked
    ? [row.role]
    : currentUserRole === 'super'
      ? (['super','admin','publisher','editor'] as AdminRole[])
      : (['publisher','editor'] as AdminRole[])

  function toggleMarket(slug: string) {
    setMarkets(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug); else next.add(slug)
      return next
    })
  }

  async function save() {
    setErr(null)
    if (!isCrossBrand && markets.size === 0) {
      setErr('Pick at least one market for this user'); return
    }
    if (!roleDecision.allowed && role !== row.role) {
      setErr(roleDecision.reason); return
    }

    setBusy(true)
    try {
      const payload: Record<string, unknown> = {
        full_name:       fullName.trim() || null,
        notes:           notes.trim() || null,
      }
      if (!roleLocked) payload.role = role
      payload.allowed_markets = isCrossBrand ? [] : Array.from(markets)

      const res = await fetch(`/api/admin/users/${row.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      onSaved({
        full_name:        fullName.trim() || null,
        role,
        allowed_markets:  isCrossBrand ? [] : Array.from(markets),
        notes:            notes.trim() || null,
      })
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-blue mb-1'

  return (
    <div className="bg-portal-blue-lt/40 border-t border-portal-blue/20 px-4 py-4">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={lbl}>Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Role {roleLocked && <span className="font-medium text-portal-blue normal-case ml-1">(locked: self)</span>}</label>
          <div className="relative">
            <select
              value={role}
              onChange={e => setRole(e.target.value as AdminRole)}
              disabled={roleLocked}
              className={`${inp} cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed appearance-none pr-8`}
            >
              {targetRoleOpts.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {!isCrossBrand && (
        <div className="mt-3">
          <p className={lbl}>Markets</p>
          <div className="flex flex-wrap gap-2">
            {MARKETS.map(m => {
              const on = markets.has(m.slug)
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => toggleMarket(m.slug)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold ring-1 transition-colors ${
                    on
                      ? 'bg-portal-navy text-white ring-blue-600'
                      : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                  }`}
                  title={marketDisplayName(m.slug)}
                >
                  {m.short}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-3">
        <label className={lbl}>Internal notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className={`${inp} resize-y text-xs`}
          placeholder="Optional notes for the staff directory (never shown publicly)."
        />
      </div>

      {err && <p className="mt-3 text-xs text-portal-red font-semibold">{err}</p>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs text-portal-blue hover:text-blue-950">
          Cancel
        </button>
      </div>

      {/* Password reset — collapsible. Hidden for invited-but-never-logged-in
          rows; we can't set a password until Supabase has minted an auth user
          for them. */}
      <PasswordResetSection row={row} />
    </div>
  )
}

// ── Password reset (collapsible inside the edit panel) ──────────────────────

function PasswordResetSection({ row }: { row: AdminUserRow }) {
  const [open, setOpen] = useState(false)
  const [pw1,  setPw1]  = useState('')
  const [pw2,  setPw2]  = useState('')
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<{ ok: boolean; text: string } | null>(null)

  const cannotReset = !row.user_id

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (pw1.length < 8) { setMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return }
    if (pw1 !== pw2)    { setMsg({ ok: false, text: "Passwords don't match." });                  return }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${row.id}/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: pw1 }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ ok: false, text: json?.error ?? `HTTP ${res.status}` })
        return
      }
      setPw1(''); setPw2('')
      setMsg({ ok: true, text: `Password updated for ${row.email}. Share it with them through a secure channel.` })
    } finally { setBusy(false) }
  }

  const inp = 'w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-blue mb-1'

  return (
    <div className="mt-4 pt-4 border-t border-portal-blue/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-portal-blue hover:text-blue-950"
      >
        <KeyRound size={12} />
        Set or reset password
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {cannotReset && (
        <p className="mt-2 text-[11px] text-portal-amber inline-flex items-center gap-1">
          <AlertTriangle size={11} /> Available once they sign in for the first time via magic link.
        </p>
      )}
      {open && !cannotReset && (
        <form onSubmit={submit} className="mt-3 grid sm:grid-cols-2 gap-3 max-w-md">
          <div>
            <label className={lbl}>New password</label>
            <input
              type="password"
              value={pw1}
              onChange={e => setPw1(e.target.value)}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>Confirm</label>
            <input
              type="password"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat password"
              className={inp}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !pw1 || !pw2}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
            >
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <KeyRound size={12} />}
              {busy ? 'Saving…' : 'Set password'}
            </button>
            {msg && (
              <p className={`text-xs font-semibold inline-flex items-center gap-1 ${msg.ok ? 'text-portal-green' : 'text-portal-red'}`}>
                {msg.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {msg.text}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
