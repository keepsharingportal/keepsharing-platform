'use client'

// DupClusterPanel — one panel per likely-duplicate cluster.
//
// Editor picks the survivor via radio. Every other row in the cluster is
// merged into it on click; all related rows (ad placements, contacts,
// short links) get repointed at the survivor and the dup rows are deleted.
//
// Defaults to selecting the cluster member with the most ad placements
// as survivor — that's the row most other tables already point at, so
// it minimizes how much DB work the merge has to do.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Mail, Phone, Megaphone, Users, Link2, RefreshCw, AlertTriangle } from 'lucide-react'

export interface ClusterMember {
  id:            string
  business_name: string
  slug:          string
  contact_email: string | null
  contact_phone: string | null
  created_at:    string
  adPlacements:  number
  contacts:      number
  shortLinks:    number
}

interface Props {
  cluster: { key: string; members: ClusterMember[] }
}

export function DupClusterPanel({ cluster }: Props) {
  const router = useRouter()
  // Default survivor: the member with the most ad placements. Tie-break
  // on oldest created_at — older rows are usually the "real" original.
  const defaultSurvivor = pickDefaultSurvivor(cluster.members)
  const [survivorId, setSurvivorId] = useState<string>(defaultSurvivor)
  // Editable canonical name for the survivor. Pre-fills with the
  // selected survivor's existing name; the editor can override to
  // something more accurate (e.g. drop trailing punctuation, fix
  // capitalization, expand an abbreviation) and that becomes the
  // business_name on the kept row when the merge commits.
  const initialName = cluster.members.find(m => m.id === defaultSurvivor)?.business_name ?? ''
  const [survivorName, setSurvivorName] = useState<string>(initialName)
  const [busy, startTransition]     = useTransition()
  const [merged, setMerged]         = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  // Keep the rename input in sync when the editor picks a different
  // survivor radio — otherwise it'd stay stuck on whoever was the
  // initial default.
  function pickSurvivor(id: string) {
    setSurvivorId(id)
    const m = cluster.members.find(x => x.id === id)
    if (m) setSurvivorName(m.business_name)
  }

  if (merged) {
    // Render a tiny success placeholder where the cluster used to be —
    // hides the now-stale rows until the editor refreshes.
    return (
      <div className="bg-portal-green-lt border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900 inline-flex items-center gap-2">
        <RefreshCw size={14} /> Merged. Refresh to recompute the duplicate clusters.
      </div>
    )
  }

  function onMerge() {
    const mergeIds = cluster.members.map(m => m.id).filter(id => id !== survivorId)
    const survivor = cluster.members.find(m => m.id === survivorId)
    if (!survivor || mergeIds.length === 0) return
    const finalName = survivorName.trim() || survivor.business_name
    const renaming  = finalName.toLowerCase() !== survivor.business_name.toLowerCase()
    if (!confirm(
      `Merge ${mergeIds.length} duplicate${mergeIds.length === 1 ? '' : 's'} into "${finalName}"?\n\n` +
      (renaming ? `The survivor row's name will change from "${survivor.business_name}" to "${finalName}".\n\n` : '') +
      `All ad placements (digital + print), contacts, and tracked links from the merged rows will be repointed at the survivor. The merged rows themselves will be deleted.`
    )) return

    setErr(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/advertisers/merge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          survivorId,
          mergeIds,
          survivorName: renaming ? finalName : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setMerged(true)
      router.refresh()
    })
  }

  return (
    <section className="bg-white rounded-lg border border-amber-200 ring-1 ring-amber-100/40 overflow-hidden">
      <header className="px-5 py-3 bg-portal-amber-lt border-b border-amber-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-portal-amber" />
          <p className="text-sm font-bold text-amber-900">
            {cluster.members.length} likely duplicates
          </p>
        </div>
        <button
          type="button"
          onClick={onMerge}
          disabled={busy || cluster.members.length < 2}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-700 text-white rounded-full hover:bg-amber-800 disabled:opacity-40 shadow-sm"
        >
          {busy ? <RefreshCw size={12} className="animate-spin" /> : null}
          {busy ? 'Merging…' : `Merge ${cluster.members.length - 1} into selected →`}
        </button>
      </header>

      {/* Rename input — pre-filled with the selected survivor's name.
          Editor can leave as-is or type a different canonical name
          that becomes the survivor's business_name post-merge. */}
      <div className="px-5 py-3 bg-portal-bg border-b border-portal-border">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1">
          Final business name
        </label>
        <input
          type="text"
          value={survivorName}
          onChange={e => setSurvivorName(e.target.value)}
          placeholder="Canonical business name (defaults to the picked survivor)"
          className="block w-full text-sm border border-portal-border rounded-lg px-3 py-2 bg-white outline-none focus:border-portal-blue"
        />
        <p className="text-[11px] text-portal-sub mt-1 leading-snug">
          Default is the picked survivor&apos;s name. Edit if you want the kept row to use a cleaner spelling.
        </p>
      </div>

      <ul className="divide-y divide-portal-border">
        {cluster.members.map(m => {
          const isSurvivor = m.id === survivorId
          return (
            <li key={m.id} className={`px-5 py-3 flex items-start gap-3 ${isSurvivor ? 'bg-portal-green-lt/60' : ''}`}>
              <label className="shrink-0 mt-1 cursor-pointer">
                <input
                  type="radio"
                  name={`survivor-${cluster.key}`}
                  checked={isSurvivor}
                  onChange={() => pickSurvivor(m.id)}
                  className="cursor-pointer accent-emerald-600"
                />
              </label>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <p className="text-sm font-bold text-portal-text">{m.business_name}</p>
                  {isSurvivor && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                      Keep
                    </span>
                  )}
                  <code className="text-[10px] text-portal-muted">{m.slug}</code>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-portal-sub">
                  <span className="inline-flex items-center gap-1"><Megaphone size={10} /> {m.adPlacements} ad{m.adPlacements === 1 ? '' : 's'}</span>
                  <span className="inline-flex items-center gap-1"><Users size={10} /> {m.contacts} contact{m.contacts === 1 ? '' : 's'}</span>
                  <span className="inline-flex items-center gap-1"><Link2 size={10} /> {m.shortLinks} link{m.shortLinks === 1 ? '' : 's'}</span>
                  {m.contact_email && <span className="inline-flex items-center gap-1"><Mail size={10} /> {m.contact_email}</span>}
                  {m.contact_phone && <span className="inline-flex items-center gap-1"><Phone size={10} /> {m.contact_phone}</span>}
                </div>
              </div>
              <a
                href={`/admin/advertisers/${m.id}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-[11px] font-bold text-portal-sub hover:text-portal-text inline-flex items-center gap-1"
              >
                Open <ExternalLink size={10} />
              </a>
            </li>
          )
        })}
      </ul>

      {err && (
        <div className="px-5 py-3 bg-portal-red-lt border-t border-portal-red/30 text-xs text-portal-red font-semibold">
          Merge failed: {err}
        </div>
      )}
    </section>
  )
}

function pickDefaultSurvivor(members: ClusterMember[]): string {
  const sorted = [...members].sort((a, b) => {
    if (b.adPlacements !== a.adPlacements) return b.adPlacements - a.adPlacements
    return a.created_at.localeCompare(b.created_at)
  })
  return sorted[0].id
}
