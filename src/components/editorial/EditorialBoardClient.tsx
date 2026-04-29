'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, Sparkles, Calendar, LayoutGrid, AlignLeft,
  Edit2, Trash2, Clock, Lock, X, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Publication = 'RRP' | 'RRB'
type View        = 'grid' | 'kanban' | 'department'

type Status =
  | 'idea' | 'assigned' | 'in-progress' | 'draft-ready'
  | 'approved' | 'scheduled' | 'published'

type EditorialItem = {
  id: string
  publication: Publication
  monthKey: string
  title: string
  department: string
  status: Status
  responsible: string | null
  dueDate: string | null
  sponsorOpportunity: string | null
  formExists: boolean
  notes: string | null
  scheduledAt: string | null
  socialCaption: string | null
  createdAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: { value: Status; label: string; color: string; bg: string; ring: string }[] = [
  { value: 'idea',       label: 'Idea',        color: 'text-gray-600',   bg: 'bg-gray-100',    ring: 'ring-gray-200'   },
  { value: 'assigned',   label: 'Assigned',    color: 'text-blue-700',   bg: 'bg-blue-50',     ring: 'ring-blue-200'   },
  { value: 'in-progress',label: 'In Progress', color: 'text-yellow-700', bg: 'bg-yellow-50',   ring: 'ring-yellow-200' },
  { value: 'draft-ready',label: 'Draft Ready', color: 'text-orange-700', bg: 'bg-orange-50',   ring: 'ring-orange-200' },
  { value: 'approved',   label: 'Approved',    color: 'text-green-700',  bg: 'bg-green-50',    ring: 'ring-green-200'  },
  { value: 'scheduled',  label: 'Scheduled',   color: 'text-teal-700',   bg: 'bg-teal-50',     ring: 'ring-teal-200'   },
  { value: 'published',  label: 'Published',   color: 'text-slate-700',  bg: 'bg-slate-100',   ring: 'ring-slate-200'  },
]

const STATUS_ORDER: Status[] = ['idea','assigned','in-progress','draft-ready','approved','scheduled','published']

const DEPARTMENTS: Record<Publication, string[]> = {
  RRP: [
    'School Bits', 'Mom to Mom', 'Grands Are Great', 'Teacher of Month',
    'Student Spotlight', 'Parent Poll', 'Local Kid Cool Things', 'Ask the Expert',
    'Classroom of Month', 'What Every Parent Should Know', 'Family Calendar',
    'Summer Fun Guide', 'Other',
  ],
  RRB: [
    'Thought', 'Humor', 'Relationships', 'Health',
    'Inspiration', 'Community', 'Travel', 'Taste',
  ],
}

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function currentMonthKey(): string {
  const d = new Date()
  return `${MONTH_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

function getMonthOptions(): string[] {
  const d = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const m = (d.getMonth() + i) % 12
    const y = d.getFullYear() + Math.floor((d.getMonth() + i) / 12)
    return `${MONTH_LABELS[m]}${String(y).slice(2)}`
  })
}

function statusCfg(s: Status) {
  return STATUSES.find(x => x.value === s) ?? STATUSES[0]
}

function nextStatus(s: Status): Status | null {
  const idx = STATUS_ORDER.indexOf(s)
  return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null
}

// ── Empty form ────────────────────────────────────────────────────────────────

type ItemForm = Omit<EditorialItem, 'id' | 'createdAt' | 'socialCaption'>

function emptyForm(pub: Publication, monthKey: string): ItemForm {
  return {
    publication: pub, monthKey, title: '', department: DEPARTMENTS[pub][0],
    status: 'idea', responsible: null, dueDate: null,
    sponsorOpportunity: null, formExists: false, notes: null, scheduledAt: null,
  }
}

// ── Mock seed data ────────────────────────────────────────────────────────────

function getMockItems(pub: Publication, monthKey: string): EditorialItem[] {
  if (pub === 'RRP') return [
    { id: 'm1', publication: 'RRP', monthKey, title: 'Wetumpka Elementary Spring Art Show',   department: 'School Bits',          status: 'published',   responsible: 'VA',     dueDate: null, sponsorOpportunity: 'Art supplies',       formExists: true,  notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm2', publication: 'RRP', monthKey, title: 'Mom to Mom: Sarah Johnson, Prattville',  department: 'Mom to Mom',           status: 'approved',    responsible: 'Jason',  dueDate: null, sponsorOpportunity: "Women's health",      formExists: true,  notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm3', publication: 'RRP', monthKey, title: 'Teacher of Month: Mrs. Kim Reed',       department: 'Teacher of Month',     status: 'draft-ready', responsible: 'Jason',  dueDate: null, sponsorOpportunity: 'Orthodontist',        formExists: true,  notes: 'Waiting on final photo', scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm4', publication: 'RRP', monthKey, title: 'Student Spotlight: Prattville STEM Win', department: 'Student Spotlight',    status: 'assigned',    responsible: 'VA',     dueDate: null, sponsorOpportunity: 'STEM programs',       formExists: false, notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm5', publication: 'RRP', monthKey, title: 'Parent Poll: Summer Camp Decisions',    department: 'Parent Poll',          status: 'idea',        responsible: null,     dueDate: null, sponsorOpportunity: null,                  formExists: false, notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm6', publication: 'RRP', monthKey, title: 'Summer Camp Guide 2026',                department: 'Summer Fun Guide',     status: 'scheduled',   responsible: 'Jason',  dueDate: null, sponsorOpportunity: 'Camps + YMCA',        formExists: false, notes: null, scheduledAt: `${new Date().getFullYear()}-06-01T06:00:00Z`, socialCaption: null, createdAt: '' },
  ]
  return [
    { id: 'm7', publication: 'RRB', monthKey, title: 'What We Owe the Next Generation',      department: 'Thought',       status: 'published',   responsible: 'Jason',  dueDate: null, sponsorOpportunity: null,                formExists: false, notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm8', publication: 'RRB', monthKey, title: "Dr. Patricia Ellison: Cover Profile",   department: 'Inspiration',   status: 'approved',    responsible: 'Jason',  dueDate: null, sponsorOpportunity: 'Medical sponsor',   formExists: false, notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm9', publication: 'RRB', monthKey, title: '60 Days in Portugal',                   department: 'Travel',        status: 'draft-ready', responsible: 'Linda B',dueDate: null, sponsorOpportunity: 'AAA Travel',        formExists: false, notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm10', publication: 'RRB', monthKey, title: "This Weekend's Reservation: Ravello",  department: 'Taste',         status: 'scheduled',   responsible: 'Jason',  dueDate: null, sponsorOpportunity: null,                formExists: false, notes: null, scheduledAt: `${new Date().getFullYear()}-05-09T06:00:00Z`, socialCaption: null, createdAt: '' },
    { id: 'm11', publication: 'RRB', monthKey, title: 'Second Act: Tom Braswell, Painter',    department: 'Inspiration',   status: 'assigned',    responsible: 'VA',     dueDate: null, sponsorOpportunity: 'Art supplies',      formExists: true,  notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
    { id: 'm12', publication: 'RRB', monthKey, title: 'Ask the Doctor: Sleep After 60',       department: 'Health',        status: 'idea',        responsible: null,     dueDate: null, sponsorOpportunity: 'Sleep clinic',      formExists: true,  notes: null, scheduledAt: null, socialCaption: null, createdAt: '' },
  ]
}

// ── Item Modal ────────────────────────────────────────────────────────────────

function ItemModal({
  item, pub, monthKey, onClose, onSave, onDelete,
}: {
  item: EditorialItem | null
  pub: Publication
  monthKey: string
  onClose: () => void
  onSave: (form: ItemForm) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const isNew = !item
  const [form, setForm] = useState<ItemForm>(() => item
    ? { publication: item.publication, monthKey: item.monthKey, title: item.title, department: item.department, status: item.status, responsible: item.responsible, dueDate: item.dueDate, sponsorOpportunity: item.sponsorOpportunity, formExists: item.formExists, notes: item.notes, scheduledAt: item.scheduledAt }
    : emptyForm(pub, monthKey)
  )
  const [saving, setSaving] = useState(false)
  const inp = 'w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-gray-900">{isNew ? 'Add Content Item' : 'Edit Item'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-700" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="Content piece title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
              <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inp}>
                {DEPARTMENTS[pub].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} className={inp}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Responsible</label>
              <input value={form.responsible ?? ''} onChange={e => setForm(f => ({ ...f, responsible: e.target.value || null }))} className={inp} placeholder="Who's writing this?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.dueDate ?? ''} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value || null }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sponsor Opportunity</label>
            <input value={form.sponsorOpportunity ?? ''} onChange={e => setForm(f => ({ ...f, sponsorOpportunity: e.target.value || null }))} className={inp} placeholder="e.g. Orthodontist, Hospital" />
          </div>
          {form.status === 'scheduled' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Scheduled Date/Time</label>
              <input type="datetime-local" value={form.scheduledAt ? form.scheduledAt.slice(0,16) : ''} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))} className={inp} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value || null }))} className={cn(inp, 'resize-none')} placeholder="Internal notes…" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.formExists} onChange={e => setForm(f => ({ ...f, formExists: e.target.checked }))} />
            <span className="text-xs font-medium text-gray-700">Public submission form exists</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          {!isNew && (
            <button onClick={async () => { if (confirm('Delete this item?')) { await onDelete(item!.id); onClose() } }}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button
              disabled={saving || !form.title}
              onClick={async () => { setSaving(true); await onSave(form); setSaving(false); onClose() }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              {isNew ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const cfg = statusCfg(status)
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 whitespace-nowrap', cfg.bg, cfg.color, cfg.ring)}>
      {cfg.label}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EditorialBoardClient() {
  const [pub, setPub]           = useState<Publication>('RRP')
  const [month, setMonth]       = useState(currentMonthKey())
  const [view, setView]         = useState<View>('grid')
  const [items, setItems]       = useState<EditorialItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [editItem, setEditItem] = useState<EditorialItem | null | 'new'>('new' as unknown as null) // null = closed
  const [showModal, setShowModal] = useState(false)
  const [modalItem, setModalItem] = useState<EditorialItem | null>(null)
  const [captionLoading, setCaptionLoading] = useState<string | null>(null)

  const monthOptions = getMonthOptions()

  // ── Data fetching ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/editorial?pub=${pub}&month=${month}`)
      const data: EditorialItem[] = res.ok ? await res.json() : []
      if (data.length > 0) {
        setItems(data.map(d => ({
          ...d,
          monthKey:           d.monthKey          ?? (d as unknown as Record<string,string>).month_key,
          dueDate:            d.dueDate            ?? (d as unknown as Record<string,string>).due_date,
          sponsorOpportunity: d.sponsorOpportunity ?? (d as unknown as Record<string,string>).sponsor_opportunity,
          formExists:         d.formExists         ?? (d as unknown as Record<string,boolean>).form_exists,
          scheduledAt:        d.scheduledAt        ?? (d as unknown as Record<string,string>).scheduled_at,
          socialCaption:      d.socialCaption      ?? (d as unknown as Record<string,string>).social_caption,
          createdAt:          d.createdAt          ?? (d as unknown as Record<string,string>).created_at,
        })))
      } else {
        setItems(getMockItems(pub, month))
      }
    } catch {
      setItems(getMockItems(pub, month))
    } finally {
      setLoading(false)
    }
  }, [pub, month])

  useEffect(() => { load() }, [load])

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const handleSave = async (form: ItemForm) => {
    if (modalItem) {
      // Update existing
      try {
        await fetch('/api/editorial', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: modalItem.id, ...form, monthKey: form.monthKey }),
        })
      } catch { /* optimistic — update locally */ }
      setItems(prev => prev.map(i => i.id === modalItem.id ? { ...i, ...form } : i))
    } else {
      // Create new
      try {
        const res = await fetch('/api/editorial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, monthKey: month }),
        })
        const data = await res.json()
        const newItem: EditorialItem = { id: data.id ?? `local-${Date.now()}`, ...form, socialCaption: null, createdAt: new Date().toISOString() }
        setItems(prev => [...prev, newItem])
      } catch {
        setItems(prev => [...prev, { id: `local-${Date.now()}`, ...form, socialCaption: null, createdAt: new Date().toISOString() }])
      }
    }
    await load()
  }

  const handleDelete = async (id: string) => {
    try { await fetch(`/api/editorial?id=${id}`, { method: 'DELETE' }) } catch { /* ok */ }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleStatusChange = async (item: EditorialItem, newStatus: Status) => {
    const isLocked = item.status === 'scheduled' || item.status === 'published'
    if (isLocked) return

    // Special: scheduled → require scheduledAt
    if (newStatus === 'scheduled' && !item.scheduledAt) {
      setModalItem(item)
      setShowModal(true)
      return
    }

    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    try {
      await fetch('/api/editorial', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      })
    } catch { /* ignore */ }

    // Trigger AI caption on Approved
    if (newStatus === 'approved') {
      setCaptionLoading(item.id)
      try {
        const res = await fetch('/api/editorial/caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, department: item.department, publication: item.publication, notes: item.notes }),
        })
        const { caption } = await res.json()
        if (caption) {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, socialCaption: caption } : i))
          await fetch('/api/editorial', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, socialCaption: caption }),
          })
        }
      } catch { /* non-blocking */ } finally {
        setCaptionLoading(null)
      }
    }
  }

  const openEdit = (item: EditorialItem | null) => {
    setModalItem(item)
    setShowModal(true)
  }

  // ── Views ───────────────────────────────────────────────────────────────────

  const depts = DEPARTMENTS[pub]
  const isLocked = (item: EditorialItem) => item.status === 'scheduled' || item.status === 'published'

  // GRID VIEW
  const GridView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Title', 'Department', 'Status', 'Responsible', 'Due', 'Sponsor Opp.', 'Form', 'Notes', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(item => (
            <tr key={item.id} className={cn('hover:bg-gray-50 transition-colors', isLocked(item) && 'opacity-70')}>
              <td className="px-3 py-2.5 max-w-48">
                <div className="font-medium text-gray-900 truncate">{item.title}</div>
                {item.socialCaption && (
                  <div className="text-[10px] text-green-600 mt-0.5 flex items-center gap-0.5">
                    <Sparkles size={9} /> Caption ready
                  </div>
                )}
                {captionLoading === item.id && (
                  <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-0.5">
                    <RefreshCw size={9} className="animate-spin" /> Generating caption…
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{item.department}</td>
              <td className="px-3 py-2.5">
                <button
                  disabled={isLocked(item)}
                  onClick={() => { const n = nextStatus(item.status); if (n) handleStatusChange(item, n) }}
                  title={isLocked(item) ? 'Locked' : `Advance to ${nextStatus(item.status) ?? 'done'}`}
                  className="cursor-pointer hover:opacity-80 disabled:cursor-default"
                >
                  <StatusBadge status={item.status} />
                </button>
                {item.status === 'scheduled' && item.scheduledAt && (
                  <div className="text-[10px] text-teal-600 mt-0.5 flex items-center gap-0.5">
                    <Lock size={9} /> {new Date(item.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-600">{item.responsible ?? '—'}</td>
              <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
              <td className="px-3 py-2.5 text-gray-500 max-w-32 truncate">{item.sponsorOpportunity ?? '—'}</td>
              <td className="px-3 py-2.5 text-center">{item.formExists ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}</td>
              <td className="px-3 py-2.5 text-gray-500 max-w-40 truncate">{item.notes ?? '—'}</td>
              <td className="px-3 py-2.5">
                <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && !loading && (
        <div className="py-10 text-center text-sm text-gray-400">No items for {month} — add the first one.</div>
      )}
    </div>
  )

  // KANBAN VIEW
  const KanbanView = () => (
    <div className="flex gap-3 overflow-x-auto pb-4 px-5 pt-1" style={{ minHeight: 400 }}>
      {STATUSES.map(s => {
        const col = items.filter(i => i.status === s.value)
        return (
          <div key={s.value} className="shrink-0 w-52 flex flex-col gap-2">
            <div className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between', s.bg, s.color)}>
              <span>{s.label}</span>
              <span className="opacity-60">{col.length}</span>
            </div>
            {col.map(item => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => openEdit(item)}
              >
                <div className="text-xs font-semibold text-gray-900 leading-tight mb-1">{item.title}</div>
                <div className="text-[10px] text-gray-500 mb-2">{item.department}</div>
                {item.responsible && <div className="text-[10px] text-blue-600">{item.responsible}</div>}
                {item.sponsorOpportunity && (
                  <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5">
                    💰 {item.sponsorOpportunity}
                  </div>
                )}
                {item.socialCaption && (
                  <div className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5">
                    <Sparkles size={9} /> Caption ready
                  </div>
                )}
                {isLocked(item) && <Lock size={10} className="text-teal-400 mt-1" />}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )

  // DEPARTMENT VIEW
  const DepartmentView = () => (
    <div className="space-y-3 p-5">
      {depts.map(dept => {
        const deptItems = items.filter(i => i.department === dept)
        if (deptItems.length === 0) return null
        return (
          <div key={dept} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-bold text-gray-700">{dept}</span>
              <span className="text-xs text-gray-400">{deptItems.length} item{deptItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {deptItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-xs">
                  <div className="flex-1 font-medium text-gray-900">{item.title}</div>
                  <StatusBadge status={item.status} />
                  {item.responsible && <span className="text-gray-400">{item.responsible}</span>}
                  {item.formExists && <span className="text-green-600 text-[10px]">Form ✓</span>}
                  <button onClick={() => openEdit(item)} className="text-gray-300 hover:text-blue-600">
                    <Edit2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Editorial Board</h1>
          <p className="text-xs text-gray-500 mt-0.5">Content planning for {pub === 'RRP' ? 'River Region Parents' : 'River Region Boom'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Publication toggle */}
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            {(['RRP','RRB'] as Publication[]).map(p => (
              <button key={p} onClick={() => setPub(p)}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-all', pub === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {p}
              </button>
            ))}
          </div>
          {/* Month selector */}
          <select value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 font-mono">
            {monthOptions.map(m => <option key={m}>{m}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            {([
              { v: 'grid' as View,       Icon: LayoutGrid, label: 'Grid' },
              { v: 'kanban' as View,     Icon: AlignLeft,  label: 'Kanban' },
              { v: 'department' as View, Icon: Calendar,   label: 'Dept' },
            ]).map(({ v, Icon, label }) => (
              <button key={v} onClick={() => setView(v)} title={label}
                className={cn('px-2.5 py-1.5 rounded-md transition-all', view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                <Icon size={14} />
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={12} />
          </button>
          <button onClick={() => { setModalItem(null); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus size={13} /> Add Item
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7]">
        <div className={cn('bg-white', view !== 'kanban' && 'rounded-xl border border-gray-200 m-4 overflow-hidden')}>
          {loading
            ? <div className="p-10 text-center text-sm text-gray-400">Loading editorial items…</div>
            : view === 'grid' ? <GridView />
            : view === 'kanban' ? <KanbanView />
            : <DepartmentView />}
        </div>
      </div>

      {/* Status key */}
      <div className="bg-white border-t border-gray-100 px-6 py-2 flex items-center gap-3 flex-wrap shrink-0">
        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Status:</span>
        {STATUSES.map(s => (
          <span key={s.value} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium ring-1', s.bg, s.color, s.ring)}>
            {s.label}
          </span>
        ))}
        <span className="text-[10px] text-gray-400 ml-3">Click status badge to advance · AI caption auto-generates on Approve</span>
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <ItemModal
          item={modalItem}
          pub={pub}
          monthKey={month}
          onClose={() => { setShowModal(false); setModalItem(null) }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
