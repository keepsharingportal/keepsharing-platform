'use client'

// Tabbed brand-profile editor. Local state until the editor clicks
// Save (entire profile at once — the API accepts partial updates so
// per-tab save would also work; we keep it whole for simplicity).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Save, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type {
  BrandSeoProfile, Pillar, SubArea, Persona, CalendarMonth, LinkableAsset,
} from '@/lib/seo/brand-profile'

interface BrandOpt { slug: string; name: string; short: string }

interface Props {
  brandSlug: string
  allBrands: BrandOpt[]
  initial:   BrandSeoProfile
}

const TABS = ['Pillars', 'Sub-areas', 'Personas', 'Calendar', 'Assets', 'Voice', 'Negative'] as const
type Tab = typeof TABS[number]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const nid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

export function BrandProfileClient({ brandSlug, allBrands, initial }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Pillars')
  const [, startTransition] = useTransition()

  const [pillars,           setPillars]           = useState<Pillar[]>(initial.pillars)
  const [subAreas,          setSubAreas]          = useState<SubArea[]>(initial.subAreas)
  const [personas,          setPersonas]          = useState<Persona[]>(initial.personas)
  const [editorialCalendar, setEditorialCalendar] = useState<Record<string, CalendarMonth>>(initial.editorialCalendar)
  const [linkableAssets,    setLinkableAssets]    = useState<LinkableAsset[]>(initial.linkableAssets)
  const [negativeSpace,     setNegativeSpace]     = useState<string[]>(initial.negativeSpace)
  const [uniqueAngles,      setUniqueAngles]      = useState<string[]>(initial.uniqueAngles)
  const [voiceNotes,        setVoiceNotes]        = useState<string>(initial.voiceNotes)

  const [saving,  setSaving]  = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/admin/seo/brand-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          brandSlug,
          pillars, subAreas, personas, editorialCalendar,
          linkableAssets, negativeSpace, uniqueAngles, voiceNotes,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'save failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } finally { setSaving(false) }
  }

  async function seedDraft() {
    if (!confirm('Run Claude to generate a first-draft profile? This OVERWRITES any current values in this editor (but does not save until you click Save).')) return
    setSeeding(true); setError(null)
    try {
      const res = await fetch('/api/admin/seo/brand-profile/seed', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandSlug }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'seed failed'); return }
      setPillars(j.pillars ?? [])
      setSubAreas(j.subAreas ?? [])
      setPersonas(j.personas ?? [])
      setEditorialCalendar(j.editorialCalendar ?? {})
      setLinkableAssets(j.linkableAssets ?? [])
      setNegativeSpace(j.negativeSpace ?? [])
      setUniqueAngles(j.uniqueAngles ?? [])
      setVoiceNotes(j.voiceNotes ?? '')
    } finally { setSeeding(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Brand selector + action row */}
      <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Lab>Brand</Lab>
        <select
          value={brandSlug}
          onChange={e => startTransition(() => router.push(`/admin/seo/brand-profile?brand=${e.target.value}`))}
          style={{ ...input, width: 'auto', minWidth: 220 }}
        >
          {allBrands.map(b => <option key={b.slug} value={b.slug}>{b.name} ({b.short})</option>)}
        </select>
        <button type="button" onClick={seedDraft} disabled={seeding} style={secondaryBtn(seeding)}>
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate first draft (Claude)
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ color: 'var(--color-portal-green)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Saved</span>}
          <button type="button" onClick={save} disabled={saving} style={primaryBtn(saving)}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save profile
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ fontSize: 12 }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} /> {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 4, display: 'inline-flex', gap: 2, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{
              padding: '8px 14px',
              background: tab === t ? 'var(--color-portal-navy)' : 'transparent',
              color: tab === t ? 'white' : 'var(--color-portal-sub)',
              border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 16 }}>
        {tab === 'Pillars'   && <PillarsTab   pillars={pillars}   setPillars={setPillars} />}
        {tab === 'Sub-areas' && <SubAreasTab  subAreas={subAreas} setSubAreas={setSubAreas} />}
        {tab === 'Personas'  && <PersonasTab  personas={personas} setPersonas={setPersonas} />}
        {tab === 'Calendar'  && <CalendarTab  editorialCalendar={editorialCalendar} setEditorialCalendar={setEditorialCalendar} />}
        {tab === 'Assets'    && <AssetsTab    linkableAssets={linkableAssets} setLinkableAssets={setLinkableAssets} />}
        {tab === 'Voice'     && <VoiceTab     voiceNotes={voiceNotes} setVoiceNotes={setVoiceNotes} uniqueAngles={uniqueAngles} setUniqueAngles={setUniqueAngles} />}
        {tab === 'Negative'  && <NegativeTab  negativeSpace={negativeSpace} setNegativeSpace={setNegativeSpace} />}
      </div>
    </div>
  )
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function PillarsTab({ pillars, setPillars }: { pillars: Pillar[]; setPillars: (p: Pillar[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <P>Each pillar is a content cluster the brand wants to dominate. Set the target keyword (the SERP we want to rank for) and the supporting keywords that round out the topic.</P>
      {pillars.map((p, i) => (
        <Card key={p.id}
          onDelete={() => setPillars(pillars.filter((_, j) => j !== i))}
        >
          <Row>
            <Field label="Title"><input type="text" value={p.title} onChange={e => setPillars(pillars.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} style={input} /></Field>
            <Field label="Status">
              <select value={p.status ?? 'planning'} onChange={e => setPillars(pillars.map((x, j) => j === i ? { ...x, status: e.target.value as Pillar['status'] } : x))} style={input}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="mature">Mature</option>
              </select>
            </Field>
          </Row>
          <Field label="Target keyword"><input type="text" value={p.target_keyword} onChange={e => setPillars(pillars.map((x, j) => j === i ? { ...x, target_keyword: e.target.value } : x))} style={input} placeholder="e.g. Montgomery summer camps" /></Field>
          <Field label="Description"><input type="text" value={p.description ?? ''} onChange={e => setPillars(pillars.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} style={input} placeholder="One sentence: what's this pillar's editorial angle?" /></Field>
          <Field label="Supporting keywords (comma-separated)"><input type="text" value={p.supporting_keywords.join(', ')} onChange={e => setPillars(pillars.map((x, j) => j === i ? { ...x, supporting_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : x))} style={input} /></Field>
        </Card>
      ))}
      <AddBtn onClick={() => setPillars([...pillars, { id: nid('pil'), title: '', target_keyword: '', supporting_keywords: [], status: 'planning' }])}>Add pillar</AddBtn>
    </section>
  )
}

function SubAreasTab({ subAreas, setSubAreas }: { subAreas: SubArea[]; setSubAreas: (s: SubArea[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <P>Per-locality keyword targeting — towns, neighborhoods, school districts. Each entry should list 5-8 phrases parents in that locality actually search.</P>
      {subAreas.map((a, i) => (
        <Card key={a.id} onDelete={() => setSubAreas(subAreas.filter((_, j) => j !== i))}>
          <Row>
            <Field label="Name"><input type="text" value={a.name} onChange={e => setSubAreas(subAreas.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={input} /></Field>
            <Field label="County / region"><input type="text" value={a.county ?? ''} onChange={e => setSubAreas(subAreas.map((x, j) => j === i ? { ...x, county: e.target.value } : x))} style={input} /></Field>
          </Row>
          <Field label="Target keywords (comma-separated)"><input type="text" value={a.target_keywords.join(', ')} onChange={e => setSubAreas(subAreas.map((x, j) => j === i ? { ...x, target_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : x))} style={input} /></Field>
          <Field label="Notes"><input type="text" value={a.notes ?? ''} onChange={e => setSubAreas(subAreas.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} style={input} placeholder="(optional)" /></Field>
        </Card>
      ))}
      <AddBtn onClick={() => setSubAreas([...subAreas, { id: nid('sa'), name: '', target_keywords: [] }])}>Add sub-area</AddBtn>
    </section>
  )
}

function PersonasTab({ personas, setPersonas }: { personas: Persona[]; setPersonas: (p: Persona[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <P>Audience sub-segments. Each persona's pain points + interests sharpen content angles for that group.</P>
      {personas.map((p, i) => (
        <Card key={p.id} onDelete={() => setPersonas(personas.filter((_, j) => j !== i))}>
          <Row>
            <Field label="Name"><input type="text" value={p.name} onChange={e => setPersonas(personas.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={input} placeholder="e.g. Working mom of elementary kids" /></Field>
            <Field label="Age range"><input type="text" value={p.age_range ?? ''} onChange={e => setPersonas(personas.map((x, j) => j === i ? { ...x, age_range: e.target.value } : x))} style={input} placeholder="30-45" /></Field>
          </Row>
          <Field label="Description"><input type="text" value={p.description ?? ''} onChange={e => setPersonas(personas.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} style={input} placeholder="One sentence" /></Field>
          <Field label="Pain points (semicolon-separated)"><input type="text" value={p.pain_points.join('; ')} onChange={e => setPersonas(personas.map((x, j) => j === i ? { ...x, pain_points: e.target.value.split(';').map(s => s.trim()).filter(Boolean) } : x))} style={input} placeholder="time-strapped; school logistics; after-school care" /></Field>
          <Field label="Interests (comma-separated)"><input type="text" value={p.interests.join(', ')} onChange={e => setPersonas(personas.map((x, j) => j === i ? { ...x, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : x))} style={input} /></Field>
        </Card>
      ))}
      <AddBtn onClick={() => setPersonas([...personas, { id: nid('per'), name: '', interests: [], pain_points: [] }])}>Add persona</AddBtn>
    </section>
  )
}

function CalendarTab({ editorialCalendar, setEditorialCalendar }: { editorialCalendar: Record<string, CalendarMonth>; setEditorialCalendar: (c: Record<string, CalendarMonth>) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <P>What's seasonally relevant each month — back-to-school, holidays, summer camps, etc. Drives the weekly audit&apos;s &quot;you have no coverage on X&quot; gap analysis.</P>
      {MONTHS.map((m, idx) => {
        const k = String(idx + 1)
        const cur = editorialCalendar[k] ?? { themes: [] }
        return (
          <div key={k} className="bg-white border border-portal-border rounded-lg" style={{ padding: 12 }}>
            <div className="fw-700" style={{ fontSize: 13, marginBottom: 8 }}>{m}</div>
            <Field label="Themes (comma-separated)"><input type="text" value={cur.themes.join(', ')} onChange={e => setEditorialCalendar({ ...editorialCalendar, [k]: { ...cur, themes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} style={input} placeholder="back-to-school, Labor Day, fall sports" /></Field>
            <Field label="Notes"><input type="text" value={cur.notes ?? ''} onChange={e => setEditorialCalendar({ ...editorialCalendar, [k]: { ...cur, notes: e.target.value } })} style={input} placeholder="(optional)" /></Field>
          </div>
        )
      })}
    </section>
  )
}

function AssetsTab({ linkableAssets, setLinkableAssets }: { linkableAssets: LinkableAsset[]; setLinkableAssets: (a: LinkableAsset[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <P>Authority pieces other sites should link to (free guides, calendars, comparison tools). These drive off-site SEO.</P>
      {linkableAssets.map((a, i) => (
        <Card key={a.id} onDelete={() => setLinkableAssets(linkableAssets.filter((_, j) => j !== i))}>
          <Row>
            <Field label="Title"><input type="text" value={a.title} onChange={e => setLinkableAssets(linkableAssets.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} style={input} /></Field>
            <Field label="URL"><input type="text" value={a.url} onChange={e => setLinkableAssets(linkableAssets.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} style={input} placeholder="/family-resource-guide or full URL" /></Field>
          </Row>
          <Field label="Description"><input type="text" value={a.description ?? ''} onChange={e => setLinkableAssets(linkableAssets.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} style={input} /></Field>
        </Card>
      ))}
      <AddBtn onClick={() => setLinkableAssets([...linkableAssets, { id: nid('ast'), title: '', url: '' }])}>Add asset</AddBtn>
    </section>
  )
}

function VoiceTab({ voiceNotes, setVoiceNotes, uniqueAngles, setUniqueAngles }: { voiceNotes: string; setVoiceNotes: (s: string) => void; uniqueAngles: string[]; setUniqueAngles: (a: string[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Voice notes (free text)">
        <textarea value={voiceNotes} onChange={e => setVoiceNotes(e.target.value)} rows={6}
          style={{ ...input, resize: 'vertical', minHeight: 120 }}
          placeholder="Tone, style, dos/don'ts, words to avoid, brand voice signatures. Read by every AI prompt." />
      </Field>
      <Field label="Unique angles (one per line)">
        <textarea value={uniqueAngles.join('\n')} onChange={e => setUniqueAngles(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={5}
          style={{ ...input, resize: 'vertical', minHeight: 100 }}
          placeholder="What makes this publication different from local competitors. One per line." />
      </Field>
    </section>
  )
}

function NegativeTab({ negativeSpace, setNegativeSpace }: { negativeSpace: string[]; setNegativeSpace: (n: string[]) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <P>Topics this publication explicitly does NOT cover. Stops the AI suggesting weird recommendations.</P>
      <Field label="Negative space (one per line)">
        <textarea value={negativeSpace.join('\n')} onChange={e => setNegativeSpace(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={8}
          style={{ ...input, resize: 'vertical', minHeight: 160 }}
          placeholder={'partisan politics\nadult content\ncelebrity gossip'} />
      </Field>
    </section>
  )
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.55 }}>{children}</p>
}
function Lab({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', color: 'var(--color-portal-sub)', marginBottom: 4 }}>{children}</label>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Lab>{label}</Lab>{children}</div>
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}
function Card({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div style={{ border: '1px solid var(--color-portal-border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-portal-bg)' }}>
      {children}
      <button type="button" onClick={onDelete} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--color-portal-red)', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Trash2 size={12} /> Remove
      </button>
    </div>
  )
}
function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 14px', background: 'white', color: 'var(--color-portal-navy)', border: '1.5px dashed var(--color-portal-border-2)', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
      <Plus size={13} /> {children}
    </button>
  )
}

const input: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid var(--color-portal-border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', color: 'var(--color-portal-text)' }
function primaryBtn(busy: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }
}
function secondaryBtn(busy: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'white', color: 'var(--color-portal-navy)', border: '1.5px solid var(--color-portal-navy)', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap' }
}
