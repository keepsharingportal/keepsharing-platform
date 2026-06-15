'use client'

// Redirect manager client. List + add form + per-row edit/delete.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface RedirectRow {
  id:          string
  from_path:   string
  to_path:     string
  status_code: number
  hits:        number
  last_hit_at: string | null
  note:        string | null
  brand_slug:  string | null
  is_active:   boolean
}

export function RedirectsClient({ initial }: { initial: RedirectRow[] }) {
  const router = useRouter()
  const [rows,  setRows]  = useState(initial)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New row form
  const [fromPath,    setFromPath]   = useState('')
  const [toPath,      setToPath]     = useState('')
  const [statusCode,  setStatusCode] = useState(301)
  const [brandSlug,   setBrandSlug]  = useState<string>('')
  const [note,        setNote]       = useState('')

  async function add() {
    if (!fromPath.trim() || !toPath.trim()) { setError('From + to are required.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/redirects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fromPath:   fromPath.trim(),
          toPath:     toPath.trim(),
          statusCode,
          brandSlug:  brandSlug || null,
          note:       note.trim() || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'Create failed.'); return }
      setRows(r => [j.row, ...r])
      setFromPath(''); setToPath(''); setNote('')
      router.refresh()
    } finally { setBusy(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this redirect? Existing external links will start 404ing again.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/seo/redirects?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Delete failed.'); return }
      setRows(r => r.filter(x => x.id !== id))
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Add form */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
          <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>Add a redirect</div>
        </div>
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 120px 120px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <Lab>From path</Lab>
            <input type="text" value={fromPath} onChange={e => setFromPath(e.target.value)} placeholder="/old-url" style={input} />
          </div>
          <div>
            <Lab>To path or URL</Lab>
            <input type="text" value={toPath} onChange={e => setToPath(e.target.value)} placeholder="/new-url or https://…" style={input} />
          </div>
          <div>
            <Lab>Status</Lab>
            <select value={statusCode} onChange={e => setStatusCode(Number(e.target.value))} style={input}>
              <option value={301}>301 perm.</option>
              <option value={302}>302 temp.</option>
              <option value={307}>307 temp.</option>
              <option value={308}>308 perm.</option>
            </select>
          </div>
          <div>
            <Lab>Brand</Lab>
            <select value={brandSlug} onChange={e => setBrandSlug(e.target.value)} style={input}>
              <option value="">All brands</option>
              <option value="rrp">RRP</option>
              <option value="mbp">MBP</option>
              <option value="aop">AOP</option>
              <option value="esp">ESP</option>
              <option value="gpp">GPP</option>
              <option value="rr50plus">50+</option>
            </select>
          </div>
          <button type="button" onClick={add} disabled={busy} style={primaryBtn(busy)}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
          </button>
          <div style={{ gridColumn: '1 / -1' }}>
            <Lab>Note (optional)</Lab>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Why this redirect exists — context for the next editor" style={input} />
          </div>
          {error && (
            <div className="alert alert-error" style={{ fontSize: 12, gridColumn: '1 / -1' }}>
              <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> {error}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-portal-border)', background: 'var(--color-portal-bg)' }}>
          <div className="fw-700 text-portal-text" style={{ fontSize: 13 }}>
            {rows.length === 0 ? 'No redirects yet.' : `${rows.length} active redirect${rows.length === 1 ? '' : 's'} · sorted by hit count`}
          </div>
        </div>
        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--color-portal-bg)' }}>
              <tr style={{ textAlign: 'left' }}>
                <Th>From</Th>
                <Th>To</Th>
                <Th center>Status</Th>
                <Th center>Brand</Th>
                <Th center>Hits</Th>
                <Th>Last hit</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                  <Td><code style={{ fontSize: 12 }}>{r.from_path}</code></Td>
                  <Td><code style={{ fontSize: 12 }}>{r.to_path}</code></Td>
                  <Td center>{r.status_code}</Td>
                  <Td center>{r.brand_slug ?? <span className="text-portal-sub">all</span>}</Td>
                  <Td center>{r.hits.toLocaleString()}</Td>
                  <Td>
                    {r.last_hit_at
                      ? <span className="text-portal-sub" style={{ fontSize: 11 }}>{new Date(r.last_hit_at).toLocaleString()}</span>
                      : <span className="text-portal-sub" style={{ fontSize: 11, fontStyle: 'italic' }}>never</span>}
                  </Td>
                  <Td center>
                    <button type="button" onClick={() => del(r.id)} disabled={busy}
                      style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--color-portal-red)' }}
                      title="Delete redirect">
                      <Trash2 size={14} />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', textAlign: center ? 'center' : 'left' }}>
      {children}
    </th>
  )
}
function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <td style={{ padding: '8px 14px', textAlign: center ? 'center' : 'left', verticalAlign: 'middle' }}>{children}</td>
}
function Lab({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>{children}</label>
}
const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--color-portal-border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', color: 'var(--color-portal-text)' }
function primaryBtn(busy: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }
}
