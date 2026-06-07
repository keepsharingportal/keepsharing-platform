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
  const [busy, startTransition]     = useTransition()
  const [merged, setMerged]         = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  if (merged) {
    // Render a tiny success placeholder where the cluster used to be —
    // hides the now-stale rows until the editor refreshes.
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900 inline-flex items-center gap-2">
        <RefreshCw size={14} /> Merged. Refresh to recompute the duplicate clusters.
      </div>
    )
  }

  function onMerge() {
    const mergeIds = cluster.members.map(m => m.id).filter(id => id !== survivorId)
    const survivor = cluster.members.find(m => m.id === survivorId)
    if (!survivor || mergeIds.length === 0) return
    if (!confirm(
      `Merge ${mergeIds.length} duplicate(s) into "${survivor.business_name}"?\n\n` +
      `All ad placements, contacts, and tracked links from the merged rows will be repointed at the survivor. The merged rows themselves will be deleted.`
    )) return

    setErr(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/advertisers/merge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ survivorId, mergeIds }),
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
    <section className="bg-white rounded-2xl border border-amber-200 ring-1 ring-amber-100/40 overflow-hidden">
      <header className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-700" />
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

      <ul className="divide-y divide-gray-100">
        {cluster.members.map(m => {
          const isSurvivor = m.id === survivorId
          return (
            <li key={m.id} className={`px-5 py-3 flex items-start gap-3 ${isSurvivor ? 'bg-emerald-50/60' : ''}`}>
              <label className="shrink-0 mt-1 cursor-pointer">
                <input
                  type="radio"
                  name={`survivor-${cluster.key}`}
                  checked={isSurvivor}
                  onChange={() => setSurvivorId(m.id)}
                  className="cursor-pointer accent-emerald-600"
                />
              </label>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <p className="text-sm font-bold text-gray-900">{m.business_name}</p>
                  {isSurvivor && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                      Keep
                    </span>
                  )}
                  <code className="text-[10px] text-gray-400">{m.slug}</code>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
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
                className="shrink-0 text-[11px] font-bold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
              >
                Open <ExternalLink size={10} />
              </a>
            </li>
          )
        })}
      </ul>

      {err && (
        <div className="px-5 py-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 font-semibold">
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
