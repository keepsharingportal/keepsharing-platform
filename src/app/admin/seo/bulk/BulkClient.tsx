'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ArticleRow {
  id:                string
  title:             string
  slug:              string
  column_slug:       string | null
  seo_title:         string | null
  seo_description:   string | null
  seo_focus_keyword: string | null
  seo_score:         number | null
  published_at:      string | null
}

interface Props {
  initialRows: ArticleRow[]
  columns:     string[]
}

type Action = 'set-focus-keyword' | 'find-replace-title' | 'find-replace-desc' | 'rescore'

export function BulkClient({ initialRows, columns }: Props) {
  const router = useRouter()

  // Filters
  const [filterColumn,   setFilterColumn]   = useState<string>('')
  const [filterScoreMax, setFilterScoreMax] = useState<string>('')   // string for empty case
  const [filterHasFK,    setFilterHasFK]    = useState<'' | 'yes' | 'no'>('')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Action panel
  const [action,     setAction]   = useState<Action>('set-focus-keyword')
  const [keyword,    setKeyword]  = useState('')
  const [findText,   setFindText] = useState('')
  const [replaceText,setRepl]     = useState('')

  // Busy / result
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<{ updated: number } | null>(null)

  const filtered = useMemo(() => {
    return initialRows.filter(r => {
      if (filterColumn && r.column_slug !== filterColumn) return false
      if (filterScoreMax !== '' && (r.seo_score ?? 100) > Number(filterScoreMax)) return false
      if (filterHasFK === 'yes' && !r.seo_focus_keyword) return false
      if (filterHasFK === 'no'  &&  r.seo_focus_keyword) return false
      return true
    })
  }, [initialRows, filterColumn, filterScoreMax, filterHasFK])

  function toggle(id: string) {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function selectAll() { setSelected(new Set(filtered.map(r => r.id))) }
  function clearSel()  { setSelected(new Set()) }

  async function apply() {
    if (selected.size === 0) { setError('Select at least one article.'); return }
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/seo/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          articleIds: Array.from(selected),
          action,
          keyword:     keyword.trim(),
          findText:    findText.trim(),
          replaceText,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Bulk apply failed.'); return }
      setResult({ updated: j.updated })
      setSelected(new Set())
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16 }}>

      {/* LEFT: filter + table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Filters */}
        <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 160 }}>
            <Lab>Column</Lab>
            <select value={filterColumn} onChange={e => setFilterColumn(e.target.value)} style={input}>
              <option value="">All columns</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 130 }}>
            <Lab>Score ≤</Lab>
            <input type="number" min={0} max={100} value={filterScoreMax} onChange={e => setFilterScoreMax(e.target.value)} placeholder="(any)" style={input} />
          </div>
          <div style={{ minWidth: 140 }}>
            <Lab>Has focus keyword</Lab>
            <select value={filterHasFK} onChange={e => setFilterHasFK(e.target.value as '' | 'yes' | 'no')} style={input}>
              <option value="">(any)</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" onClick={selectAll} style={ghostBtn}>Select all ({filtered.length})</button>
            <button type="button" onClick={clearSel}  style={ghostBtn}>Clear</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--color-portal-bg)' }}>
              <tr>
                <Th></Th>
                <Th>Title</Th>
                <Th center>Score</Th>
                <Th>Column</Th>
                <Th>Focus kw</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                  <Td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></Td>
                  <Td>
                    <Link href={`/admin/articles/${r.id}/seo`} target="_blank" className="text-portal-blue fw-700" style={{ textDecoration: 'none', fontSize: 12 }}>
                      {r.seo_title ?? r.title}
                    </Link>
                  </Td>
                  <Td center>
                    {typeof r.seo_score === 'number' ? r.seo_score : <span className="text-portal-sub">—</span>}
                  </Td>
                  <Td><span className="text-portal-sub" style={{ fontSize: 12 }}>{r.column_slug ?? '—'}</span></Td>
                  <Td><span className="text-portal-sub" style={{ fontSize: 12 }}>{r.seo_focus_keyword ?? '—'}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: action panel */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
          <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Apply to {selected.size} article{selected.size === 1 ? '' : 's'}</div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Lab>Action</Lab>
            <select value={action} onChange={e => setAction(e.target.value as Action)} style={input}>
              <option value="set-focus-keyword">Set focus keyword</option>
              <option value="find-replace-title">Find & replace in SEO title</option>
              <option value="find-replace-desc">Find & replace in meta description</option>
              <option value="rescore">Re-score (no field changes)</option>
            </select>
          </div>

          {action === 'set-focus-keyword' && (
            <div>
              <Lab>New focus keyword</Lab>
              <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Montgomery summer camps" style={input} />
            </div>
          )}
          {(action === 'find-replace-title' || action === 'find-replace-desc') && (
            <>
              <div>
                <Lab>Find</Lab>
                <input type="text" value={findText} onChange={e => setFindText(e.target.value)} placeholder="literal string" style={input} />
              </div>
              <div>
                <Lab>Replace with</Lab>
                <input type="text" value={replaceText} onChange={e => setRepl(e.target.value)} placeholder="(can be empty to remove)" style={input} />
              </div>
            </>
          )}

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12 }}>
              <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> {error}
            </div>
          )}
          {result && (
            <div className="alert alert-success" style={{ fontSize: 12 }}>
              <CheckCircle2 size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> Updated {result.updated} article{result.updated === 1 ? '' : 's'}.
            </div>
          )}

          <button type="button" onClick={apply} disabled={busy || selected.size === 0} style={primaryBtn(busy)}>
            {busy ? <><Loader2 size={14} className="animate-spin" /><span>Applying…</span></> : <span>Apply</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: center ? 'center' : 'left' }}>{children}</th>
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td style={{ padding: '8px 14px', textAlign: center ? 'center' : 'left', verticalAlign: 'middle' }}>{children}</td>
}
function Lab({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>{children}</label>
}
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--color-portal-border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', color: 'var(--color-portal-text)' }
function primaryBtn(busy: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }
}
const ghostBtn: React.CSSProperties = { padding: '6px 10px', background: 'white', color: 'var(--color-portal-sub)', border: '1px solid var(--color-portal-border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }
