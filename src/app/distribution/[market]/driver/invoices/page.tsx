// /distribution/[market]/driver/invoices — driver invoice history.
//
// Read-only view of every delivery the signed-in driver has submitted,
// reviewed, or been paid for. Columns: month, route, stops, calculated
// pay, final pay (when adjusted), status, paid-at.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Navigation, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ market: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return { title: `Invoices — ${marketDisplayName(market)}` }
}

function fmtMonth(m: string): string {
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default async function DriverInvoicesPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return <Centered>
      <Link href={`/login?next=${encodeURIComponent(`/distribution/${market}/driver/invoices`)}`} className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold">Sign in</Link>
    </Centered>
  }

  const admin = createAdminClient()
  const { data: drv } = await admin.from('circulation_drivers').select('full_name, active, market').eq('user_id', user.id).maybeSingle()
  if (!drv || !drv.active || drv.market !== market) return <Centered>Not a driver for {marketDisplayName(market)}.</Centered>

  const { data: rows } = await admin
    .from('circulation_deliveries')
    .select('id, month, status, stops_completed, pay_calculated, pay_final, submitted_at, paid_at, circulation_routes(name)')
    .eq('driver_id', user.id)
    .order('month', { ascending: false })
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(36)

  type Row = {
    id: string; month: string; status: string; stops_completed: number;
    pay_calculated: number; pay_final: number | null;
    submitted_at: string | null; paid_at: string | null;
    circulation_routes?: { name: string } | null;
  }
  const invoices = (rows as Row[] | null ?? [])

  return (
    <div className="min-h-screen bg-background public-page">
      <header className="border-b border-border bg-card">
        <div className="container py-3 flex items-center gap-3">
          <Link href={`/distribution/${market}/driver`} className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Navigation className="h-5 w-5 text-primary" />
          <p className="text-sm font-bold">{drv.full_name} — Invoices</p>
        </div>
      </header>

      <main className="container py-6 space-y-3 max-w-3xl">
        <h1 className="text-xl font-black flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" /> My delivery invoices
        </h1>

        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card">
            <p className="text-sm text-muted-foreground">No invoices yet. Submit your first delivery to see it here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {invoices.map(r => {
              const pay = r.pay_final ?? r.pay_calculated
              return (
                <li key={r.id} className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{fmtMonth(r.month)} — {r.circulation_routes?.name ?? 'Route'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.stops_completed} stop{r.stops_completed === 1 ? '' : 's'}
                      {r.submitted_at && ` · Submitted ${new Date(r.submitted_at).toLocaleDateString()}`}
                      {r.paid_at && ` · Paid ${new Date(r.paid_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-bold ${r.status === 'paid' ? 'text-emerald-600' : 'text-foreground'}`}>{fmtMoney(pay)}</p>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{r.status}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background public-page flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}
