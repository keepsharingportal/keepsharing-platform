'use client'

import { useState, useTransition } from 'react'
import { CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import type { StripeIntegrationRow, StripeProductRow, StripeSubscriptionRow, StripeChargeRow } from './page'
import {
  connectStripeAction, disconnectStripeAction,
  createStripeProductAction, deactivateStripeProductAction,
} from './actions'

interface Props {
  row:              StripeIntegrationRow | null
  products:         StripeProductRow[]
  subscriptions:    StripeSubscriptionRow[]
  charges:          StripeChargeRow[]
  mtdRevenueCents:  number
}

const KIND_LABELS: Record<StripeProductRow['kind'], string> = {
  ad_placement:     'Ad placement',
  featured_upgrade: 'Featured upgrade',
  sponsor_tier:     'Sponsor tier',
  event_listing:    'Event listing',
  one_time:         'One-time',
}

export function StripeClient(props: Props) {
  return (
    <div className="space-y-6">
      <SummaryRow row={props.row} mtdRevenueCents={props.mtdRevenueCents} activeSubsCount={props.subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length} />
      {props.row ? <ConnectedConnectionCard row={props.row} /> : <ConnectForm />}
      {props.row && <ProductManager products={props.products} />}
      {props.row && props.subscriptions.length > 0 && <SubscriptionsTable subscriptions={props.subscriptions} />}
      {props.row && props.charges.length > 0 && <ChargesTable charges={props.charges} />}
    </div>
  )
}

function SummaryRow({ row, mtdRevenueCents, activeSubsCount }: { row: StripeIntegrationRow | null; mtdRevenueCents: number; activeSubsCount: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard label="MTD revenue" value={`$${(mtdRevenueCents / 100).toFixed(2)}`} sub="Succeeded charges" />
      <SummaryCard label="Active subscriptions" value={activeSubsCount.toLocaleString()} sub="Recurring revenue" />
      <SummaryCard
        label="Mode"
        value={row ? (row.is_test_mode ? 'Test' : 'Live') : '—'}
        sub={row?.account_name ?? row?.account_id ?? 'Not connected'}
      />
      <SummaryCard
        label="Last webhook"
        value={row?.last_webhook_at ? new Date(row.last_webhook_at).toLocaleString() : '—'}
        sub="Heartbeat"
      />
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{label}</div>
      <div className="text-2xl font-bold text-portal-text mt-1">{value}</div>
      <div className="text-[11px] text-portal-muted mt-0.5">{sub}</div>
    </div>
  )
}

function ConnectedConnectionCard({ row }: { row: StripeIntegrationRow }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  return (
    <div className="bg-white border border-portal-border rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <CreditCard size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-portal-text">{row.account_name ?? row.account_id ?? 'Connected'}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 size={9} /> Connected
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${row.is_test_mode ? 'bg-portal-amber-lt text-portal-amber border border-portal-amber/30' : 'bg-portal-green-lt text-portal-green border border-portal-green/30'}`}>
              {row.is_test_mode ? 'Test' : 'Live'}
            </span>
            {!row.webhook_signing_secret && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <AlertCircle size={9} /> Webhook secret missing
              </span>
            )}
          </div>
          <p className="text-[11px] text-portal-sub mt-1">Connected {new Date(row.connected_at).toLocaleDateString()}</p>
        </div>
        <div>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className="text-xs font-bold text-red-700 hover:text-red-900 inline-flex items-center gap-1">
              <Trash2 size={11} /> Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => start(async () => { await disconnectStripeAction() })}
                disabled={pending}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {pending ? 'Disconnecting…' : 'Yes, disconnect'}
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConnectForm() {
  const [secretKey, setSecretKey] = useState('')
  const [publishable, setPublishable] = useState('')
  const [signingSecret, setSigningSecret] = useState('')
  const [isTestMode, setIsTestMode] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setErr(null)
    start(async () => {
      const out = await connectStripeAction({
        secretKey:             secretKey.trim(),
        publishableKey:        publishable.trim(),
        webhookSigningSecret:  signingSecret.trim(),
        isTestMode,
      })
      if (!out.ok) setErr(out.error)
    })
  }

  return (
    <div className="bg-white border border-portal-border rounded-lg p-5 space-y-3 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-portal-blue-lt flex items-center justify-center text-portal-blue">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-portal-text">Connect Stripe</h3>
          <p className="text-[11px] text-portal-sub">From <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-portal-blue hover:underline">Stripe Dashboard → Developers → API keys</a>.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="testMode" checked={isTestMode} onChange={e => setIsTestMode(e.target.checked)} />
        <label htmlFor="testMode" className="text-xs text-portal-text">Test mode (use sk_test_ + pk_test_ keys)</label>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Secret key</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={secretKey}
            onChange={e => setSecretKey(e.target.value)}
            placeholder={isTestMode ? 'sk_test_...' : 'sk_live_...'}
            className="w-full text-xs font-mono px-3 py-2 pr-9 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
          />
          <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-portal-muted hover:text-portal-text">
            {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Publishable key</label>
        <input
          type="text"
          value={publishable}
          onChange={e => setPublishable(e.target.value)}
          placeholder={isTestMode ? 'pk_test_...' : 'pk_live_...'}
          className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Webhook signing secret <span className="text-portal-muted normal-case font-normal">(from your webhook endpoint settings)</span></label>
        <input
          type="text"
          value={signingSecret}
          onChange={e => setSigningSecret(e.target.value)}
          placeholder="whsec_..."
          className="w-full text-xs font-mono px-3 py-2 border border-portal-border rounded-md bg-white text-portal-text focus:outline-none focus:border-portal-blue"
        />
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-[11px] text-red-700 inline-flex items-start gap-2">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-sans">{err}</pre>
        </div>
      )}

      <div>
        <button
          onClick={submit}
          disabled={pending}
          className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50"
        >
          {pending ? 'Validating…' : 'Connect Stripe'}
        </button>
      </div>
    </div>
  )
}

function ProductManager({ products }: { products: StripeProductRow[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-portal-text">Products</h3>
          <p className="text-[11px] text-portal-muted">Each product is mirrored to Stripe + linked locally so the right side-effect fires on checkout.</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-bold text-portal-blue hover:text-portal-blue-dk inline-flex items-center gap-1 border border-portal-blue/30 bg-portal-blue-lt px-3 py-1.5 rounded-md">
            <Plus size={11} /> New product
          </button>
        )}
      </div>
      {adding && <NewProductForm onDone={() => setAdding(false)} />}
      {products.length === 0 ? (
        <p className="text-xs text-portal-muted">No products yet. Create one to enable checkout for that flow.</p>
      ) : (
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
              <th className="pb-2">Name</th>
              <th className="pb-2">Kind</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2">Interval</th>
              <th className="pb-2">Stripe ID</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border">
            {products.map(p => (
              <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                <td className="py-1.5 text-portal-text">{p.display_name}</td>
                <td className="py-1.5 text-portal-sub">{KIND_LABELS[p.kind]}</td>
                <td className="py-1.5 text-right text-portal-text font-bold">${(p.price_cents / 100).toFixed(2)}</td>
                <td className="py-1.5 text-portal-sub">{p.interval ?? 'one-time'}</td>
                <td className="py-1.5 text-portal-muted font-mono text-[10px]">{p.stripe_price_id}</td>
                <td className="py-1.5 text-right">
                  {p.is_active && <DeactivateButton id={p.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function NewProductForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<StripeProductRow['kind']>('one_time')
  const [priceDollars, setPriceDollars] = useState('')
  const [interval, setInterval] = useState<'' | 'month' | 'year'>('')
  const [targetTable, setTargetTable] = useState<'ad_placements' | 'advertiser_packages' | 'calendar_events' | ''>('')
  const [targetId, setTargetId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setErr(null)
    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100)
    if (!Number.isFinite(priceCents) || priceCents <= 0) { setErr('Invalid price.'); return }
    if (!name.trim()) { setErr('Name required.'); return }
    if (kind === 'ad_placement' && (!targetTable || !targetId.trim())) {
      setErr('Ad placement products need a target row. Pick a table + paste the placement id.')
      return
    }
    start(async () => {
      const out = await createStripeProductAction({
        kind,
        displayName:         name.trim(),
        displayDescription:  description.trim() || undefined,
        priceCents,
        interval:            interval || null,
        targetTable:         targetTable || undefined,
        targetId:            targetId.trim() || undefined,
      })
      if (!out.ok) setErr(out.error)
      else onDone()
    })
  }

  return (
    <div className="bg-portal-bg border border-portal-border rounded-md p-4 mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Kind</label>
          <select value={kind} onChange={e => setKind(e.target.value as StripeProductRow['kind'])} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            {(Object.entries(KIND_LABELS) as Array<[StripeProductRow['kind'], string]>).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Price (USD)</label>
          <input type="number" min="0" step="0.01" value={priceDollars} onChange={e => setPriceDollars(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Interval</label>
          <select value={interval} onChange={e => setInterval(e.target.value as '' | 'month' | 'year')} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
            <option value="">One-time</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Description (optional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white" />
      </div>
      {(kind === 'ad_placement' || kind === 'featured_upgrade' || kind === 'event_listing') && (
        <div className="grid grid-cols-[10rem_1fr] gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Target table</label>
            <select value={targetTable} onChange={e => setTargetTable(e.target.value as 'ad_placements' | 'advertiser_packages' | 'calendar_events' | '')} className="w-full text-xs px-2 py-1.5 border border-portal-border rounded-md bg-white">
              <option value="">— pick —</option>
              <option value="ad_placements">ad_placements</option>
              <option value="advertiser_packages">advertiser_packages</option>
              <option value="calendar_events">calendar_events</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-portal-sub mb-1">Target id (UUID)</label>
            <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="paste the row UUID" className="w-full text-xs font-mono px-2 py-1.5 border border-portal-border rounded-md bg-white" />
          </div>
        </div>
      )}
      {err && <p className="text-[11px] text-red-700">{err}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={pending} className="text-xs font-bold text-white bg-portal-blue hover:bg-portal-blue-dk px-3 py-1.5 rounded-md disabled:opacity-50">
          {pending ? 'Creating…' : 'Create in Stripe'}
        </button>
        <button onClick={onDone} className="text-xs font-bold text-portal-sub hover:text-portal-text">Cancel</button>
      </div>
    </div>
  )
}

function DeactivateButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => { await deactivateStripeProductAction(id) })}
      disabled={pending}
      className="text-[11px] text-red-700 hover:text-red-900"
    >
      {pending ? '…' : 'Deactivate'}
    </button>
  )
}

function SubscriptionsTable({ subscriptions }: { subscriptions: StripeSubscriptionRow[] }) {
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Recent subscriptions</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
            <th className="pb-2">Subscription</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Period end</th>
            <th className="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {subscriptions.map(s => (
            <tr key={s.id}>
              <td className="py-1.5 text-portal-text font-mono text-[10px]">{s.stripe_subscription_id}</td>
              <td className="py-1.5">
                <span className={`text-[10px] font-bold uppercase ${
                  s.status === 'active' ? 'text-portal-green' :
                  s.status === 'trialing' ? 'text-portal-blue' :
                  s.status === 'past_due' ? 'text-portal-amber' :
                  'text-portal-muted'
                }`}>{s.status}</span>
              </td>
              <td className="py-1.5 text-portal-sub">{s.current_period_end ?? '—'}</td>
              <td className="py-1.5 text-portal-muted">{new Date(s.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function ChargesTable({ charges }: { charges: StripeChargeRow[] }) {
  return (
    <section className="bg-white border border-portal-border rounded-lg p-5">
      <h3 className="text-sm font-bold text-portal-text mb-3">Recent charges</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-portal-muted text-left">
            <th className="pb-2">When</th>
            <th className="pb-2">Description</th>
            <th className="pb-2">Status</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {charges.map(c => (
            <tr key={c.id}>
              <td className="py-1.5 text-portal-sub">{new Date(c.occurred_at).toLocaleString()}</td>
              <td className="py-1.5 text-portal-text">{c.description ?? c.stripe_charge_id}</td>
              <td className="py-1.5">
                <span className={`text-[10px] font-bold uppercase ${
                  c.status === 'succeeded' ? 'text-portal-green' :
                  c.status === 'failed' ? 'text-red-700' :
                  c.status === 'refunded' ? 'text-portal-amber' :
                  'text-portal-muted'
                }`}>{c.status}</span>
              </td>
              <td className="py-1.5 text-right text-portal-text font-bold">${(c.amount_cents / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
