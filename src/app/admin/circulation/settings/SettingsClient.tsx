'use client'

// Settings client. Mirrors admin/settings.php from the v3_FINAL portal
// source — typed form grouped into General / Delivery & Archive / Public
// map taglines / Pickup request form sections. PATCHes
// /api/admin/circulation/settings { key, value } per saved field.

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  market:   string
  initial:  Record<string, string>
  publicMapLinks: Array<{ label: string; href: string }>
}

const SETTINGS_FIELDS = {
  general: [
    { key: 'site_name',         label: 'Site name',                       type: 'text',  help: '' },
    { key: 'admin_email',       label: 'Admin email (invoices + change requests)', type: 'email', help: '' },
    { key: 'ops_email',         label: 'Distribution manager email',      type: 'email', help: 'Receives driver submissions, changes, and requests.' },
    { key: 'owner_email',       label: 'Owner / publisher email',         type: 'email', help: 'Receives summaries + critical alerts.' },
    { key: 'bookkeeper_email',  label: 'Bookkeeper email (optional CC)',  type: 'email', help: 'Leave blank to skip — invoices won’t CC the bookkeeper.' },
  ],
  delivery: [
    { key: 'bundle_size',       label: 'Bundle size (mags per bundle)', type: 'number', help: '' },
    { key: 'archive_day',       label: 'Auto-archive on day of month',  type: 'number', help: 'Drivers can still submit late within the late-submit window below.' },
    { key: 'late_submit_days',  label: 'Late submission window (days after month end)', type: 'number', help: '' },
  ],
  taglines: [
    { key: 'public_rrp_tagline',  label: 'RRP map tagline',  type: 'text', help: '' },
    { key: 'public_boom_tagline', label: 'Boom / 50+ map tagline', type: 'text', help: '' },
  ],
  requestNotes: [
    { key: 'request_form_note_rrp',  label: 'RRP request form intro',  type: 'textarea', help: '' },
    { key: 'request_form_note_boom', label: 'Boom / 50+ request form intro', type: 'textarea', help: '' },
  ],
} as const

export function SettingsClient({ market, initial, publicMapLinks }: Props) {
  const [vals,    setVals]    = useState<Record<string, string>>(initial)
  const [busy,    setBusy]    = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [err,     setErr]     = useState<string | null>(null)

  function setVal(key: string, value: string) {
    setVals(v => ({ ...v, [key]: value }))
    setSavedAt(null)
  }

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      // PATCH each key sequentially — keep the endpoint simple.
      for (const [key, value] of Object.entries(vals)) {
        const res = await fetch('/api/admin/circulation/settings', {
          method:  'PATCH',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ market, key, value }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setErr(`Failed on ${key}: ${j.error ?? res.statusText}`)
          return
        }
      }
      setSavedAt(new Date().toLocaleTimeString())
    } finally { setBusy(false) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div><h1 className="ph-title">Settings</h1></div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="card" style={{ maxWidth: 640 }}>
          <SettingsGroup title="General" fields={SETTINGS_FIELDS.general} vals={vals} setVal={setVal} />
          <SettingsGroup title="Delivery & Archive" fields={SETTINGS_FIELDS.delivery} vals={vals} setVal={setVal} />
          <SettingsGroup title="Public map taglines" fields={SETTINGS_FIELDS.taglines} vals={vals} setVal={setVal} />
          <SettingsGroup title="Pickup request form text" fields={SETTINGS_FIELDS.requestNotes} vals={vals} setVal={setVal} />

          {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

          <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
            <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
              {busy ? 'Saving…' : 'Save settings'}
            </button>
            {savedAt && (
              <span className="text-sm" style={{ color: 'var(--color-portal-green)' }}>✓ Saved at {savedAt}</span>
            )}
          </div>
        </div>

        <div className="card" style={{ maxWidth: 640, marginTop: 16 }}>
          <div className="card-title mb-3">Quick links</div>
          <div className="flex gap-2 flex-wrap">
            {publicMapLinks.map(l => (
              <Link key={l.href} href={l.href} target="_blank" className="btn btn-ghost btn-sm">
                {l.label} ↗
              </Link>
            ))}
            <Link href={`/distribution/${market}/request`} target="_blank" className="btn btn-ghost btn-sm">
              Pickup request form ↗
            </Link>
          </div>
          <div className="text-muted" style={{ marginTop: 12, fontSize: 12 }}>
            Market: <code>{market}</code>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsGroup({ title, fields, vals, setVal }: {
  title: string
  fields: ReadonlyArray<{ key: string; label: string; type: string; help: string }>
  vals:   Record<string, string>
  setVal: (k: string, v: string) => void
}) {
  return (
    <>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--color-portal-border)' }}>
        {title}
      </h3>
      {fields.map(f => (
        <div key={f.key} className="fg">
          <label>{f.label}</label>
          {f.type === 'textarea' ? (
            <textarea value={vals[f.key] ?? ''} onChange={e => setVal(f.key, e.target.value)} rows={3} />
          ) : (
            <input
              type={f.type}
              value={vals[f.key] ?? ''}
              onChange={e => setVal(f.key, e.target.value)}
            />
          )}
          {f.help && <div className="hint">{f.help}</div>}
        </div>
      ))}
    </>
  )
}
