'use client'

import { useState, useTransition } from 'react'
import { Plus, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { MARKETS } from '@/lib/markets'
import { saveCategoryAction, deleteCategoryAction } from '../actions'

interface Category {
  id:            string
  brand_slug:    string
  slug:          string
  name:          string
  description:   string | null
  emoji:         string | null
  display_order: number | null
  is_active:     boolean
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  // Group by brand for display.
  const byBrand: Record<string, Category[]> = {}
  for (const c of categories) {
    if (!byBrand[c.brand_slug]) byBrand[c.brand_slug] = []
    byBrand[c.brand_slug].push(c)
  }
  return (
    <div className="space-y-4">
      {MARKETS.map(m => (
        <BrandCategoriesBlock key={m.slug} brandSlug={m.slug} brandName={m.displayName} categories={byBrand[m.slug] ?? []} />
      ))}
    </div>
  )
}

function BrandCategoriesBlock({ brandSlug, brandName, categories }: { brandSlug: string; brandName: string; categories: Category[] }) {
  const [expanded, setExpanded] = useState(categories.length > 0)
  const [adding, setAdding] = useState(false)

  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full px-5 py-3 hover:bg-portal-bg text-left flex items-center gap-3">
        {expanded ? <ChevronDown size={14} className="text-portal-muted" /> : <ChevronRight size={14} className="text-portal-muted" />}
        <span className="text-sm font-bold text-portal-text">{brandName}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-portal-sub bg-portal-bg border border-portal-border px-1.5 py-0.5 rounded-full">
          {categories.length}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-portal-border divide-y divide-portal-border">
          {categories.map(c => <CategoryRow key={c.id} category={c} />)}
          {adding ? (
            <NewCategoryRow brandSlug={brandSlug} onDone={() => setAdding(false)} />
          ) : (
            <div className="px-5 py-2.5">
              <button onClick={() => setAdding(true)} className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk inline-flex items-center gap-1">
                <Plus size={11} /> Add category
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryRow({ category }: { category: Category }) {
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji ?? '')
  const [description, setDescription] = useState(category.description ?? '')
  const [displayOrder, setDisplayOrder] = useState(category.display_order?.toString() ?? '')
  const [isActive, setIsActive] = useState(category.is_active)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  function save() {
    start(async () => {
      const out = await saveCategoryAction({
        id:           category.id,
        brandSlug:    category.brand_slug,
        slug:         category.slug,
        name,
        emoji,
        description,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : null,
        isActive,
      })
      setMsg(out.ok ? 'Saved' : `Error: ${out.error}`)
      setTimeout(() => setMsg(null), 2500)
    })
  }

  function remove() {
    if (!confirm(`Delete "${category.name}"? Listings tagged with this category will keep the slug but lose the category label.`)) return
    startDelete(async () => { await deleteCategoryAction(category.id) })
  }

  return (
    <div className="px-5 py-3 grid grid-cols-[3rem_2.5rem_1fr_2fr_4rem_5rem_8rem] gap-2 items-center text-xs">
      <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🩺" className="px-1.5 py-1 border border-portal-border rounded text-center bg-white" maxLength={4} />
      <span className="font-mono text-portal-muted truncate" title={category.slug}>{category.slug}</span>
      <input value={name} onChange={e => setName(e.target.value)} className="px-2 py-1 border border-portal-border rounded bg-white" />
      <input value={description} onChange={e => setDescription(e.target.value)} placeholder="One-line description" className="px-2 py-1 border border-portal-border rounded bg-white" />
      <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} placeholder="—" className="px-2 py-1 border border-portal-border rounded bg-white" />
      <label className="inline-flex items-center gap-1 text-portal-text">
        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={save} disabled={pending} className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk inline-flex items-center gap-1">
          <Save size={11} /> {pending ? '…' : 'Save'}
        </button>
        <button onClick={remove} disabled={deleting} className="text-xs text-red-700 hover:text-red-900">
          <Trash2 size={11} />
        </button>
        {msg && <span className="text-[10px] text-portal-sub">{msg}</span>}
      </div>
    </div>
  )
}

function NewCategoryRow({ brandSlug, onDone }: { brandSlug: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function autoSlug(val: string) {
    if (!slug) setSlug(val.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60))
  }

  function save() {
    setErr(null)
    start(async () => {
      const out = await saveCategoryAction({
        brandSlug, slug, name, emoji, description,
        displayOrder: null, isActive: true,
      })
      if (!out.ok) { setErr(out.error); return }
      onDone()
    })
  }

  return (
    <div className="px-5 py-3 bg-portal-bg/50 space-y-2">
      <div className="grid grid-cols-[3rem_8rem_1fr_2fr_8rem] gap-2 items-center text-xs">
        <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🩺" maxLength={4} className="px-1.5 py-1 border border-portal-border rounded bg-white text-center" />
        <input value={slug}  onChange={e => setSlug(e.target.value)}  placeholder="slug" className="px-2 py-1 border border-portal-border rounded bg-white font-mono" />
        <input value={name}  onChange={e => { setName(e.target.value); autoSlug(e.target.value) }} placeholder="Name" className="px-2 py-1 border border-portal-border rounded bg-white" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="px-2 py-1 border border-portal-border rounded bg-white" />
        <div className="flex items-center gap-2 justify-end">
          <button onClick={save} disabled={pending || !slug || !name} className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk disabled:opacity-50">
            {pending ? '…' : 'Add'}
          </button>
          <button onClick={onDone} className="text-xs text-portal-sub hover:text-portal-text">Cancel</button>
        </div>
      </div>
      {err && <p className="text-[11px] text-red-700">{err}</p>}
    </div>
  )
}
