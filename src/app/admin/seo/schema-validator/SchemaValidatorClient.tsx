'use client'

import { useState } from 'react'
import { ShieldCheck, RotateCw, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Issue {
  page:     string
  severity: 'error' | 'warning' | 'info'
  type:     string
  message:  string
}

interface ValidatorResult {
  brandSlug:     string
  expectedOrgId: string
  ranAt:         string
  pagesChecked:  number
  schemaBlocks:  number
  issues:        Issue[]
  summary:       { errors: number; warnings: number; info: number }
}

export function SchemaValidatorClient({ brands }: { brands: Array<{ slug: string; name: string }> }) {
  const [brandSlug, setBrandSlug] = useState(brands[0]?.slug ?? 'rrp')
  const [pageLimit, setPageLimit] = useState(30)
  const [busy,      setBusy]      = useState(false)
  const [result,    setResult]    = useState<ValidatorResult | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  async function run() {
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/admin/seo/schema-validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandSlug, pageLimit }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error ?? 'Validation failed')
      setResult(j as ValidatorResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // Group issues by severity then by page for the render.
  const groups = result
    ? { errors: groupBy(result.issues.filter(i => i.severity === 'error'), i => i.page),
        warnings: groupBy(result.issues.filter(i => i.severity === 'warning'), i => i.page),
        info: groupBy(result.issues.filter(i => i.severity === 'info'), i => i.page) }
    : null

  return (
    <div className="space-y-4">

      {/* Controls */}
      <div className="bg-white border border-portal-border rounded-lg p-4 flex items-center gap-3 flex-wrap">
        <label className="text-[12px] font-semibold text-portal-sub">Brand</label>
        <select
          className="px-2.5 py-1.5 border border-portal-border-2 rounded-lg text-[13px] outline-none focus:border-portal-blue bg-white"
          value={brandSlug}
          onChange={e => setBrandSlug(e.target.value)}
        >
          {brands.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>

        <label className="text-[12px] font-semibold text-portal-sub ml-2">Pages to check</label>
        <input
          type="number" min={5} max={60}
          className="w-[70px] px-2 py-1 border border-portal-border-2 rounded text-[13px] outline-none focus:border-portal-blue"
          value={pageLimit}
          onChange={e => setPageLimit(Number(e.target.value))}
        />

        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-semibold text-white bg-portal-navy rounded-lg hover:opacity-90 disabled:opacity-50 ml-auto"
        >
          <RotateCw size={13} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Validating…' : 'Run validator'}
        </button>
      </div>

      {error && (
        <div className="bg-portal-red-lt text-portal-red rounded-lg p-3 text-[12px] inline-flex items-center gap-2">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-5 gap-3">
            <Stat label="Pages checked"  value={String(result.pagesChecked)} />
            <Stat label="Schema blocks"  value={String(result.schemaBlocks)} />
            <Stat label="Errors"         value={String(result.summary.errors)}   tone={result.summary.errors === 0 ? 'green' : 'red'} />
            <Stat label="Warnings"       value={String(result.summary.warnings)} tone={result.summary.warnings === 0 ? 'green' : 'amber'} />
            <Stat label="Info"           value={String(result.summary.info)} />
          </div>

          {result.summary.errors === 0 && result.summary.warnings === 0 ? (
            <div className="bg-white border border-portal-border rounded-lg p-6 text-center" style={{ borderLeft: '3px solid var(--color-portal-green)' }}>
              <ShieldCheck size={36} className="mx-auto text-portal-green mb-2" />
              <strong className="text-[15px] text-portal-text">Schema graph clean.</strong>
              <p className="text-[12px] text-portal-sub mt-1">
                Organization @id consistent, author Person references resolve, breadcrumbs well-formed, no duplicates.
              </p>
              <p className="text-[11px] text-portal-sub mt-3">
                Sample size: {result.pagesChecked} pages · {result.schemaBlocks} JSON-LD blocks · Expected Organization @id: <code>{result.expectedOrgId}</code>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups && groups.errors.size > 0 && (
                <IssueGroup title={`Errors (${result.summary.errors})`} tone="red" icon={<AlertTriangle size={13} />} groups={groups.errors} />
              )}
              {groups && groups.warnings.size > 0 && (
                <IssueGroup title={`Warnings (${result.summary.warnings})`} tone="amber" icon={<AlertCircle size={13} />} groups={groups.warnings} />
              )}
              {groups && groups.info.size > 0 && (
                <IssueGroup title={`Info (${result.summary.info})`} tone="blue" icon={<CheckCircle2 size={13} />} groups={groups.info} />
              )}
            </div>
          )}

          <p className="text-[11px] text-portal-sub">
            Validation completed {new Date(result.ranAt).toLocaleString()}.
            Expected Organization <code>@id</code>: <code>{result.expectedOrgId}</code>
          </p>
        </>
      )}
    </div>
  )
}

function IssueGroup({ title, tone, icon, groups }: {
  title: string
  tone:  'red' | 'amber' | 'blue'
  icon:  React.ReactNode
  groups: Map<string, Issue[]>
}) {
  const border = tone === 'red' ? 'var(--color-portal-red)' : tone === 'amber' ? 'var(--color-portal-amber)' : 'var(--color-portal-blue)'
  return (
    <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="bg-portal-bg px-4 py-2.5 border-b border-portal-border" style={{ borderLeft: `3px solid ${border}` }}>
        <strong className={`text-[13px] inline-flex items-center gap-1.5 ${
          tone === 'red' ? 'text-portal-red' : tone === 'amber' ? 'text-portal-amber' : 'text-portal-blue'
        }`}>
          {icon} {title}
        </strong>
      </div>
      <div className="divide-y divide-portal-border">
        {Array.from(groups.entries()).map(([page, issues]) => (
          <div key={page} className="px-4 py-3">
            <a href={page} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-portal-blue break-all">
              {page}
            </a>
            <ul className="mt-1.5 space-y-1">
              {issues.map((it, i) => (
                <li key={i} className="text-[12px] text-portal-text">
                  <span className="inline-block px-1.5 py-0.5 bg-portal-bg text-portal-sub text-[10px] font-bold uppercase tracking-wider rounded mr-2">{it.type}</span>
                  {it.message}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'amber' | 'green' }) {
  const valueClass = tone === 'red'   ? 'text-portal-red'
                   : tone === 'amber' ? 'text-portal-amber'
                   : tone === 'green' ? 'text-portal-green'
                   :                    'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${valueClass}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const item of arr) {
    const k = key(item)
    const list = m.get(k) ?? []
    list.push(item)
    m.set(k, list)
  }
  return m
}
