'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, MapPin, Package, MessageSquare, ChevronRight } from 'lucide-react'

export interface DeliveryProgressRow {
  id:               string
  driver_name:      string
  route_name:       string
  status:           string
  total:            number
  done:             number
  leftovers:        number
  stops_completed:  number
  pay_calculated:   number
  pay_final:        number | null
  submitted_at:     string | null
  paid_at:          string | null
  month:            string
}

interface FocusStop {
  id:             string
  name:           string
  address:        string | null
  city:           string | null
  sort_order:     number
  is_pickup:      boolean
  not_delivering: boolean
  checked:        boolean
  checked_at:     string | null
  driver_note:    string | null
  leftovers:      number
  leftovers_json: Record<string, number> | null
}

interface Props {
  rows:        DeliveryProgressRow[]
  months:      string[]
  activeMonth: string
  focusDetail: { delivery: DeliveryProgressRow; stops: FocusStop[] } | null
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-800',
  reviewed:  'bg-indigo-100 text-indigo-800',
  paid:      'bg-emerald-100 text-emerald-800',
}

function fmtShortMonth(m: string): string {
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function ProgressMonitor({ rows, months, activeMonth, focusDetail }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function gotoMonth(m: string) {
    const q = new URLSearchParams(params)
    q.set('month', m)
    q.delete('delivery')
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  function gotoDelivery(id: string) {
    const q = new URLSearchParams(params)
    q.set('delivery', id)
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  function backToList() {
    const q = new URLSearchParams(params)
    q.delete('delivery')
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  if (focusDetail) {
    const d = focusDetail.delivery
    const pct = d.total > 0 ? Math.round(d.done / d.total * 100) : 0
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
          ← Back to month
        </button>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {d.done} <span className="text-base font-normal text-gray-500">of {d.total} stops</span>
              </p>
            </div>
            <p className={`text-3xl font-bold ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {pct}%
            </p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-gray-600 flex-wrap">
            <span><span className="font-bold text-gray-900">{d.driver_name}</span> · {d.route_name}</span>
            <span className={`inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${STATUS_COLOR[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {d.status}
            </span>
            {d.submitted_at && <span>Submitted {new Date(d.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
            {d.leftovers > 0 && <span className="inline-flex items-center gap-1 text-amber-700 font-semibold"><Package size={11} /> {d.leftovers} leftover</span>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <p className="px-4 py-3 text-sm font-bold text-gray-900 border-b border-gray-100">Every stop</p>
          <ul className="divide-y divide-gray-100">
            {focusDetail.stops.map((s, idx) => {
              const number = s.is_pickup ? 'P' : (idx + (focusDetail.stops.findIndex(x => !x.is_pickup) >= 0 ? 0 : 1))
              const bg = s.checked ? 'bg-emerald-50' : s.not_delivering ? 'bg-rose-50' : ''
              return (
                <li key={s.id} className={`px-4 py-3 flex items-center gap-3 ${bg}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.checked    ? 'bg-emerald-500 text-white' :
                    s.is_pickup  ? 'bg-blue-500 text-white'    :
                                   'bg-white border-2 border-gray-300 text-gray-400'
                  }`}>
                    {s.checked ? <Check size={12} strokeWidth={3} /> : s.is_pickup ? 'P' : number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${s.checked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {s.name}
                      {s.not_delivering && <span className="ml-2 text-[10px] text-red-700">(not delivering)</span>}
                    </p>
                    {s.address && <p className="text-[11px] text-gray-500">{s.address}{s.city ? `, ${s.city}` : ''}</p>}
                    {s.driver_note && (
                      <p className="text-[11px] text-amber-700 mt-0.5 inline-flex items-center gap-1">
                        <MessageSquare size={10} /> {s.driver_note}
                      </p>
                    )}
                    {s.leftovers > 0 && (
                      <p className="text-[11px] text-amber-700 mt-0.5 inline-flex items-center gap-1">
                        <Package size={10} /> Leftover: {s.leftovers_json
                          ? Object.entries(s.leftovers_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
                          : `${s.leftovers} copies`}
                      </p>
                    )}
                  </div>
                  {s.checked && s.checked_at && (
                    <span className="shrink-0 text-[10px] text-emerald-700 font-semibold">
                      {new Date(s.checked_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 mr-1">Month:</span>
        {months.length === 0 && <span className="text-xs text-gray-400 italic">No deliveries yet</span>}
        {months.map(m => (
          <button
            key={m}
            onClick={() => gotoMonth(m)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${m === activeMonth ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
          >
            {fmtShortMonth(m)}
          </button>
        ))}
        {!months.includes(activeMonth) && (
          <button
            onClick={() => gotoMonth(activeMonth)}
            className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-blue-600 text-white border-blue-600"
          >
            {fmtShortMonth(activeMonth)}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center bg-white">
          <p className="text-sm text-gray-500">No deliveries on file for this month.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => {
            const pct = r.total > 0 ? Math.round(r.done / r.total * 100) : 0
            return (
              <li key={r.id}>
                <button
                  onClick={() => gotoDelivery(r.id)}
                  className="w-full text-left rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{r.driver_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {r.route_name}
                        <span className={`ml-2 inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {r.status}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{r.done}<span className="text-xs font-normal text-gray-500">/{r.total}</span></p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">stops</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{pct}%</p>
                        {r.pay_final != null
                          ? <p className="text-[10px] text-emerald-700 font-semibold">{fmtMoney(r.pay_final)}</p>
                          : <p className="text-[10px] text-gray-400">{fmtMoney(r.pay_calculated)}</p>}
                      </div>
                      <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {r.leftovers > 0 && (
                    <p className="mt-2 text-[11px] text-amber-700 inline-flex items-center gap-1">
                      <Package size={10} /> {r.leftovers} total leftover this run
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
