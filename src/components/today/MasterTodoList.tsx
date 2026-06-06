'use client'

// MasterTodoList — pulls from /api/admin/todos and renders the backlog
// grouped by category, with parent/sub-todo hierarchy. Built to be
// batch-friendly: collapse-by-category, filter by status, and a quick
// "add to this category" inline form so the editor can capture new
// ideas without leaving /admin/today.

import { useEffect, useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, Circle, CheckCircle2, AlertCircle, Pause, MinusCircle, X, ListChecks } from 'lucide-react'

interface Todo {
  id:           string
  parent_id:    string | null
  title:        string
  category:     string
  priority:     'launch-blocker' | 'high' | 'medium' | 'low' | 'parked'
  status:       'open' | 'in-progress' | 'done'
  notes:        string | null
  display_order: number
  completed_at: string | null
  created_at:   string
}

interface CategoryDef {
  key:   string
  label: string
  emoji: string
  hint:  string
}

const CATEGORIES: CategoryDef[] = [
  { key: 'launch',      label: 'Launch blockers',   emoji: '🚀', hint: 'Stuff that has to land before/at the public flip.' },
  { key: 'ads',         label: 'Ads & sponsors',    emoji: '📢', hint: 'Slot inventory, renewals, the inquiry → booking pipeline.' },
  { key: 'advertisers', label: 'Advertisers',       emoji: '🧑‍💼', hint: 'CRM-side: how the editor finds, classifies, and serves advertisers.' },
  { key: 'ghl',         label: 'GHL integration',   emoji: '🔁', hint: 'Webhooks, custom values, workflow triggers — the marketing automation glue.' },
  { key: 'phase-2',     label: 'Phase 2 (Stripe)',  emoji: '💳', hint: 'Self-serve checkout. Replaces the email-fire in SlotInquiryModal.' },
  { key: 'games',       label: 'Brain games',       emoji: '🧠', hint: 'Cron health, auto-approve toggle, budget tuning.' },
  { key: 'family-hub',  label: 'Family Hub',        emoji: '🏠', hint: 'Aspirational membership concept — parked until specced.' },
  { key: 'ops',         label: 'Ops & migrations',  emoji: '🛠️', hint: 'Database, CI/CD, housekeeping.' },
  { key: 'general',     label: 'General',           emoji: '📝', hint: 'Anything that doesn\'t fit elsewhere.' },
]

const PRIORITY_STYLE: Record<Todo['priority'], { label: string; bg: string; text: string; ring: string }> = {
  'launch-blocker': { label: 'LAUNCH BLOCKER', bg: 'bg-red-600',    text: 'text-white',   ring: 'ring-red-700'    },
  high:             { label: 'High',           bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-200' },
  medium:           { label: 'Medium',         bg: 'bg-blue-50',    text: 'text-blue-800',   ring: 'ring-blue-200'   },
  low:              { label: 'Low',            bg: 'bg-gray-50',    text: 'text-gray-600',   ring: 'ring-gray-200'   },
  parked:           { label: 'Parked',         bg: 'bg-purple-50',  text: 'text-purple-700', ring: 'ring-purple-200' },
}

export function MasterTodoList() {
  const [todos,    setTodos]    = useState<Todo[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showDone,  setShowDone]  = useState(false)
  const [addingTo,  setAddingTo]  = useState<string | null>(null)   // category key for inline add
  const [newTitle,  setNewTitle]  = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/todos', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `HTTP ${res.status}`); setTodos([]); return }
      setTodos(json.todos as Todo[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Group todos by category, threading parent/child relationships so each
  // category renders its top-level items with sub-todos nested under them.
  const grouped = useMemo(() => {
    const byCategory: Record<string, Todo[]> = {}
    const byParent: Record<string, Todo[]>   = {}
    for (const t of todos) {
      if (t.parent_id) {
        if (!byParent[t.parent_id]) byParent[t.parent_id] = []
        byParent[t.parent_id].push(t)
      } else {
        if (!byCategory[t.category]) byCategory[t.category] = []
        byCategory[t.category].push(t)
      }
    }
    return { byCategory, byParent }
  }, [todos])

  const counts = useMemo(() => {
    let open = 0, inProgress = 0, done = 0
    for (const t of todos) {
      if (t.status === 'open')        open++
      if (t.status === 'in-progress') inProgress++
      if (t.status === 'done')        done++
    }
    return { open, inProgress, done, total: todos.length }
  }, [todos])

  async function patchTodo(id: string, body: Partial<Todo>) {
    // Optimistic update so the checkbox feels snappy.
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...body } : t))
    await fetch('/api/admin/todos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, ...body }),
    })
    // Refresh so completed_at + server-derived fields stay in sync.
    load()
  }

  async function addTodo(category: string) {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    setAddingTo(null)
    await fetch('/api/admin/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, category }),
    })
    load()
  }

  async function deleteTodo(id: string) {
    if (!confirm('Delete this todo (and any sub-todos)?')) return
    await fetch('/api/admin/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    load()
  }

  function toggleCollapse(category: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category); else next.add(category)
      return next
    })
  }

  function cycleStatus(t: Todo): Todo['status'] {
    if (t.status === 'open')        return 'in-progress'
    if (t.status === 'in-progress') return 'done'
    return 'open'
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 via-white to-white flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-amber-700" />
          <h2 className="text-sm font-black text-gray-900 tracking-tight">Master backlog</h2>
          <span className="text-[11px] text-gray-500 ml-1">
            {counts.open} open · {counts.inProgress} in progress · {counts.done} done
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showDone}
              onChange={e => setShowDone(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            Show done
          </label>
        </div>
      </header>

      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-xs text-red-800">
          {error}{error.includes('relation') || error.includes('does not exist')
            ? ' — apply supabase/migrations/121_admin_todos.sql in Supabase to seed this list.'
            : ''}
        </div>
      )}

      {loading ? (
        <p className="p-6 text-sm text-gray-400">Loading…</p>
      ) : todos.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 italic">
          No todos yet. Apply migration 121 in Supabase to seed the starter backlog, or add one below.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {CATEGORIES.map(cat => {
            const items = grouped.byCategory[cat.key] ?? []
            // Hide empty categories unless the user has clicked "Add" inside them.
            if (items.length === 0 && addingTo !== cat.key) return null
            const isCollapsed = collapsed.has(cat.key)
            const openInCat   = items.filter(i => i.status !== 'done').length
            return (
              <div key={cat.key}>
                <button
                  onClick={() => toggleCollapse(cat.key)}
                  className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-sm font-bold text-gray-900">{cat.label}</span>
                    <span className="text-[11px] text-gray-400">{openInCat} open · {items.length} total</span>
                  </div>
                  {isCollapsed ? <ChevronRight size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>

                {!isCollapsed && (
                  <div className="px-3 pb-3 space-y-1">
                    <p className="px-2 text-[11px] text-gray-500 italic mb-1.5">{cat.hint}</p>
                    {items
                      .filter(t => showDone || t.status !== 'done')
                      .map(t => (
                        <TodoRow
                          key={t.id}
                          todo={t}
                          children={grouped.byParent[t.id] ?? []}
                          showDone={showDone}
                          onCycle={() => patchTodo(t.id, { status: cycleStatus(t) })}
                          onCycleChild={(child) => patchTodo(child.id, { status: cycleStatus(child) })}
                          onDelete={() => deleteTodo(t.id)}
                        />
                      ))
                    }

                    {/* Inline add */}
                    {addingTo === cat.key ? (
                      <div className="mt-2 ml-7 flex items-center gap-2">
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addTodo(cat.key)
                            if (e.key === 'Escape') { setAddingTo(null); setNewTitle('') }
                          }}
                          placeholder="New todo…"
                          className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-gray-500"
                        />
                        <button
                          onClick={() => addTodo(cat.key)}
                          className="text-xs font-bold text-white bg-gray-900 hover:bg-gray-700 px-3 py-1.5 rounded-lg"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingTo(null); setNewTitle('') }}
                          className="text-xs text-gray-500 hover:text-gray-900"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingTo(cat.key); setNewTitle('') }}
                        className="mt-1 ml-7 text-[11px] font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                      >
                        <Plus size={11} /> Add to {cat.label.toLowerCase()}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Catch-all for any category not in CATEGORIES (legacy seeds, etc.) */}
          {Object.entries(grouped.byCategory).map(([cat, items]) => {
            if (CATEGORIES.some(c => c.key === cat)) return null
            return (
              <div key={cat} className="px-5 py-3">
                <p className="text-xs font-bold text-gray-500 mb-2">{cat}</p>
                {items.filter(t => showDone || t.status !== 'done').map(t => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    children={grouped.byParent[t.id] ?? []}
                    showDone={showDone}
                    onCycle={() => patchTodo(t.id, { status: cycleStatus(t) })}
                    onCycleChild={(child) => patchTodo(child.id, { status: cycleStatus(child) })}
                    onDelete={() => deleteTodo(t.id)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  todo:    Todo
  children: Todo[]
  showDone: boolean
  onCycle:      () => void
  onCycleChild: (child: Todo) => void
  onDelete:     () => void
}

function TodoRow({ todo, children, showDone, onCycle, onCycleChild, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(true)
  const visibleChildren = children.filter(c => showDone || c.status !== 'done')
  const doneCount = children.filter(c => c.status === 'done').length

  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-gray-50 group">
      <div className="flex items-start gap-2">
        <button
          onClick={onCycle}
          className="shrink-0 mt-0.5"
          title={`Status: ${todo.status} — click to cycle`}
        >
          <StatusIcon status={todo.status} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] font-medium leading-snug ${todo.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {todo.title}
            </span>
            <PriorityPill priority={todo.priority} />
            {children.length > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700"
              >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {doneCount}/{children.length} sub-tasks
              </button>
            )}
          </div>
          {todo.notes && (
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{todo.notes}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-600 transition-opacity"
          title="Delete"
        >
          <X size={12} />
        </button>
      </div>

      {expanded && visibleChildren.length > 0 && (
        <div className="ml-6 mt-1 pl-2 border-l border-gray-200 space-y-1">
          {visibleChildren.map(child => (
            <div key={child.id} className="flex items-start gap-2 py-0.5">
              <button
                onClick={() => onCycleChild(child)}
                className="shrink-0 mt-0.5"
                title={`Status: ${child.status} — click to cycle`}
              >
                <StatusIcon status={child.status} small />
              </button>
              <span className={`flex-1 text-[12px] leading-snug ${child.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {child.title}
                {child.notes && <span className="block text-[10px] text-gray-400 mt-0.5">{child.notes}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status, small }: { status: Todo['status']; small?: boolean }) {
  const size = small ? 12 : 14
  if (status === 'done')        return <CheckCircle2 size={size} className="text-green-600" />
  if (status === 'in-progress') return <AlertCircle  size={size} className="text-amber-500" />
  return <Circle size={size} className="text-gray-300" />
}

function PriorityPill({ priority }: { priority: Todo['priority'] }) {
  const s = PRIORITY_STYLE[priority]
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {priority === 'parked' && <Pause size={9} />}
      {priority === 'launch-blocker' && <MinusCircle size={9} />}
      {s.label}
    </span>
  )
}
