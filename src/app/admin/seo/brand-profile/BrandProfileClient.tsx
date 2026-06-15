'use client'

// Tabbed brand-profile editor. Local state until the editor clicks
// Save (entire profile at once — the API accepts partial updates so
// per-tab save would also work; we keep it whole for simplicity).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Save, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react'
import type {
  BrandSeoProfile, Pillar, SubArea, Persona, CalendarMonth, LinkableAsset,
  EditorialPrefs, CompetitorIntel, CompetitorEntry,
} from '@/lib/seo/brand-profile'

interface BrandOpt { slug: string; name: string; short: string }

interface Props {
  brandSlug: string
  allBrands: BrandOpt[]
  initial:   BrandSeoProfile
}

const TABS = ['Pillars', 'Sub-areas', 'Personas', 'Calendar', 'Assets', 'Voice', 'Negative', 'Prefs', 'Competitors'] as const
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
  const [editorialPrefs,    setEditorialPrefs]    = useState<EditorialPrefs>(initial.editorialPrefs ?? {})
  const [competitorIntel,   setCompetitorIntel]   = useState<CompetitorIntel>(initial.competitorIntel ?? {})

  const [saving,  setSaving]  = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [regenInfo, setRegenInfo] = useState<{ applied: string[]; preserved: string[] } | null>(null)
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
          editorialPrefs, competitorIntel,
        }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'save failed'); return }
      setSaved(true); setTimeout(() => setSaved(false), 1800)
    } finally { setSaving(false) }
  }

  /** Preview-only seed — overwrites the LOCAL editor state but doesn't
   *  save. Used for the initial "Generate first draft" flow. */
  async function seedDraft() {
    if (!confirm('Run Claude to generate a first-draft profile? This overwrites any unsaved changes in this editor (does not save until you click Save).')) return
    setSeeding(true); setError(null); setRegenInfo(null)
    try {
      const res = await fetch('/api/admin/seo/brand-profile/seed', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandSlug, save: false }),
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
      setEditorialPrefs(j.editorialPrefs ?? {})
      setCompetitorIntel(j.competitorIntel ?? {})
    } finally { setSeeding(false) }
  }

  /** Merge-mode regenerate — saves directly, but only fills empty fields.
   *  Anything the editor has tuned stays untouched. Refreshes the page
   *  after to load the merged result. */
  async function regenerateMerge() {
    if (!confirm('Regenerate with Claude in MERGE mode? Empty fields will be filled in; anything you\'ve already tuned will be preserved.')) return
    setSeeding(true); setError(null); setRegenInfo(null)
    try {
      const res = await fetch('/api/admin/seo/brand-profile/seed', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brandSlug, save: true, mode: 'merge' }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'regenerate failed'); return }
      setRegenInfo({ applied: j.applied ?? [], preserved: j.preserved ?? [] })
      // Force refresh from server so we load the merged state.
      router.refresh()
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
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate first draft
        </button>
        <button type="button" onClick={regenerateMerge} disabled={seeding} style={secondaryBtn(seeding)} title="Fill empty fields, preserve your edits">
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />} Regenerate (merge)
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ color: 'var(--color-portal-green)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Saved</span>}
          <button type="button" onClick={save} disabled={saving} style={primaryBtn(saving)}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save profile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-portal-red-lt text-portal-red border border-portal-red rounded-lg p-3 text-[12px]" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <strong className="block mb-1">Generation error</strong>
              <pre className="whitespace-pre-wrap break-words text-[11px] font-mono">{error}</pre>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-portal-red hover:underline text-[11px] shrink-0">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {regenInfo && (
        <div className="bg-white border border-portal-border rounded-lg" style={{ padding: 12, borderLeft: '3px solid var(--color-portal-green)' }}>
          <strong className="text-portal-text" style={{ fontSize: 13 }}>
            <CheckCircle2 size={13} className="inline -translate-y-px mr-1 text-portal-green" />
            Merge regenerate complete
          </strong>
          <div className="text-portal-sub" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
            <strong>Filled in:</strong> {regenInfo.applied.length === 0 ? 'nothing — your profile is fully tuned' : regenInfo.applied.join(', ')}
            <br />
            <strong>Preserved your tunings:</strong> {regenInfo.preserved.length === 0 ? 'nothing was preserved (all fields were empty)' : regenInfo.preserved.join(', ')}
          </div>
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
        {tab === 'Voice'      && <VoiceTab     voiceNotes={voiceNotes} setVoiceNotes={setVoiceNotes} uniqueAngles={uniqueAngles} setUniqueAngles={setUniqueAngles} />}
        {tab === 'Negative'   && <NegativeTab  negativeSpace={negativeSpace} setNegativeSpace={setNegativeSpace} />}
        {tab === 'Prefs'      && <PrefsTab     editorialPrefs={editorialPrefs} setEditorialPrefs={setEditorialPrefs} />}
        {tab === 'Competitors'&& <CompetitorsTab competitorIntel={competitorIntel} setCompetitorIntel={setCompetitorIntel} />}
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

function PrefsTab({ editorialPrefs, setEditorialPrefs }: { editorialPrefs: EditorialPrefs; setEditorialPrefs: (p: EditorialPrefs) => void }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <P>How this brand prefers to publish. These choices shape every AI recommendation — format, voice, cadence, evergreen vs timely balance.</P>
      <Row>
        <Field label="Format preference">
          <select value={editorialPrefs.formatPreference ?? ''} onChange={e => setEditorialPrefs({ ...editorialPrefs, formatPreference: (e.target.value || undefined) as EditorialPrefs['formatPreference'] })} style={input}>
            <option value="">— Not specified —</option>
            <option value="long-form">Long-form (1500+ word in-depth)</option>
            <option value="list">Lists / how-tos (scan-friendly)</option>
            <option value="mixed">Mixed (both work)</option>
          </select>
        </Field>
        <Field label="Voice preference">
          <select value={editorialPrefs.voicePreference ?? ''} onChange={e => setEditorialPrefs({ ...editorialPrefs, voicePreference: (e.target.value || undefined) as EditorialPrefs['voicePreference'] })} style={input}>
            <option value="">— Not specified —</option>
            <option value="peer">Peer (texting a friend)</option>
            <option value="expert">Expert (named-source authority)</option>
            <option value="institutional">Institutional (formal magazine voice)</option>
          </select>
        </Field>
      </Row>
      <Field label="Publishing cadence">
        <input type="text" value={editorialPrefs.publishingCadence ?? ''} onChange={e => setEditorialPrefs({ ...editorialPrefs, publishingCadence: e.target.value })} style={input}
          placeholder="e.g. 2-4 articles per week with seasonal spikes around school transitions" />
      </Field>
      <Field label="Evergreen vs timely balance">
        <input type="text" value={editorialPrefs.evergreenVsTimely ?? ''} onChange={e => setEditorialPrefs({ ...editorialPrefs, evergreenVsTimely: e.target.value })} style={input}
          placeholder="e.g. 60% evergreen / 40% timely; lean evergreen on schools, timely on events" />
      </Field>
    </section>
  )
}

function CompetitorsTab({ competitorIntel, setCompetitorIntel }: { competitorIntel: CompetitorIntel; setCompetitorIntel: (c: CompetitorIntel) => void }) {
  const competitors = competitorIntel.competitors ?? []
  const gaps        = competitorIntel.gapsWeOwn   ?? []
  function setCompetitors(next: CompetitorEntry[]) {
    setCompetitorIntel({ ...competitorIntel, competitors: next })
  }
  function setGaps(next: string[]) {
    setCompetitorIntel({ ...competitorIntel, gapsWeOwn: next })
  }
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <P>Who else covers this market — and what they suck at. This is YOUR intel that Claude can&apos;t guess from public info. Gaps you list become directly actionable in unique angles + editorial planning.</P>

      <div>
        <Lab>Competitors</Lab>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {competitors.map((c, i) => (
            <Card key={i} onDelete={() => setCompetitors(competitors.filter((_, j) => j !== i))}>
              <Row>
                <Field label="Name"><input type="text" value={c.name} onChange={e => setCompetitors(competitors.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={input} placeholder="e.g. River Region Living" /></Field>
                <Field label="URL"><input type="text" value={c.url ?? ''} onChange={e => setCompetitors(competitors.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} style={input} placeholder="https://…" /></Field>
              </Row>
              <Field label="What they do well"><input type="text" value={c.strengths ?? ''} onChange={e => setCompetitors(competitors.map((x, j) => j === i ? { ...x, strengths: e.target.value } : x))} style={input} placeholder="e.g. strong restaurant coverage + social engagement" /></Field>
              <Field label="What they suck at / where they're weak"><input type="text" value={c.weaknesses ?? ''} onChange={e => setCompetitors(competitors.map((x, j) => j === i ? { ...x, weaknesses: e.target.value } : x))} style={input} placeholder="e.g. no school content, generic family advice" /></Field>
            </Card>
          ))}
          <AddBtn onClick={() => setCompetitors([...competitors, { name: '' }])}>Add competitor</AddBtn>
        </div>
      </div>

      <Field label="Gaps we own (one per line)">
        <textarea value={gaps.join('\n')} onChange={e => setGaps(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={6}
          style={{ ...input, resize: 'vertical', minHeight: 120 }}
          placeholder={'School-quality content for Pike Road / Prattville\nNamed pediatrician reviews\nDeep relocation guides for military families\nLocal mom interview series'} />
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
