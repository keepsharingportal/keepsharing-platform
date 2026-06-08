// /admin/contacts — flat list of every advertiser_contact across all
// businesses. The 'find the person I'm talking to' view: useful when
// you remember a name (or the phone number you just got a call from)
// but not which business they belong to. Click any row → jump to the
// parent business's profile, where editing lives.

import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import {
  Users, Search, Mail, Phone, Star, AlertTriangle, Building2,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Contacts — Admin' }
export const dynamic  = 'force-dynamic'

const ROLE_OPTIONS = ['all', 'ad_rep', 'billing', 'listing_owner', 'decision_maker', 'other'] as const
const ROLE_LABEL: Record<string, string> = {
  ad_rep:          'Ad Rep',
  billing:         'Billing',
  listing_owner:   'Listing Owner',
  decision_maker:  'Decision Maker',
  other:           'Other',
}
const ROLE_BADGE: Record<string, string> = {
  ad_rep:          'bg-sky-100 text-sky-800',
  billing:         'bg-portal-amber-lt text-portal-amber',
  listing_owner:   'bg-violet-100 text-violet-800',
  decision_maker:  'bg-portal-green-lt text-portal-green',
  other:           'bg-gray-100 text-portal-sub',
}

interface Props {
  searchParams: Promise<{ q?: string; role?: string }>
}

export default async function ContactsPage({ searchParams }: Props) {
  await requireAdmin()
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const role  = (params.role ?? 'all') as (typeof ROLE_OPTIONS)[number]

  const supabase = createAdminClient()
  // Pull every contact + the business they belong to. Two queries
  // because Supabase's join via FK still has us decorating client-side;
  // the in-memory join is trivial at our scale.
  const [contactsRes, businessesRes] = await Promise.all([
    supabase
      .from('advertiser_contacts')
      .select('id, advertiser_account_id, name, email, phone, role, is_primary, ghl_contact_id, notes')
      .order('is_primary', { ascending: false })
      .order('name',       { ascending: true })
      .limit(5000),
    supabase
      .from('advertiser_accounts')
      .select('id, business_name, slug, lifecycle_stage')
      .limit(5000),
  ])

  // Migration 128 not applied → table-missing banner so the page is
  // still useful (shows nothing, says why).
  const contactsTableMissing = !!contactsRes.error
    && /relation .* does not exist/i.test(contactsRes.error.message ?? '')

  type Contact = {
    id: string; advertiser_account_id: string; name: string;
    email: string | null; phone: string | null;
    role: 'ad_rep' | 'billing' | 'listing_owner' | 'decision_maker' | 'other';
    is_primary: boolean; ghl_contact_id: string | null; notes: string | null;
  }
  type Business = { id: string; business_name: string; slug: string | null; lifecycle_stage: string | null }
  const contacts   = (contactsRes.data ?? []) as Contact[]
  const businesses = (businessesRes.data ?? []) as Business[]
  const bizMap = new Map(businesses.map(b => [b.id, b]))

  // Filter in memory. Tiny datasets; clear filter semantics.
  const lowerQuery = query.toLowerCase()
  const filtered = contacts.filter(c => {
    if (role !== 'all' && c.role !== role) return false
    if (!query) return true
    const biz = bizMap.get(c.advertiser_account_id)
    return (
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.email ?? '').toLowerCase().includes(lowerQuery) ||
      (c.phone ?? '').toLowerCase().includes(lowerQuery) ||
      (biz?.business_name ?? '').toLowerCase().includes(lowerQuery)
    )
  })

  // For each role, count to inform the filter pill labels.
  const counts: Record<string, number> = { all: contacts.length }
  for (const c of contacts) counts[c.role] = (counts[c.role] ?? 0) + 1

  function hrefWithRole(r: string): string {
    const sp = new URLSearchParams()
    if (query)    sp.set('q', query)
    if (r !== 'all') sp.set('role', r)
    const qs = sp.toString()
    return `/admin/contacts${qs ? '?' + qs : ''}`
  }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg min-h-full">

      {/* ── Header + search ─────────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-portal-text inline-flex items-center gap-2">
              <Users size={20} className="text-portal-muted" /> Contacts
            </h1>
            <p className="text-xs text-portal-sub mt-1">
              Flat view of every contact across all businesses. Click any row to open the business profile.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter + search bar ─────────────────────────── */}
      <div className="bg-white border-b border-portal-border px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {ROLE_OPTIONS.map(r => {
            const on    = role === r
            const label = r === 'all' ? 'All' : ROLE_LABEL[r]
            return (
              <a
                key={r}
                href={hrefWithRole(r)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  on
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-portal-text border border-portal-border hover:bg-portal-bg'
                }`}
              >
                {label}
                <span className={`ml-1.5 ${on ? 'opacity-80' : 'text-portal-muted'}`}>
                  {counts[r] ?? 0}
                </span>
              </a>
            )
          })}
        </div>
        <form className="flex items-center gap-2" action="/admin/contacts" method="get">
          {role !== 'all' && <input type="hidden" name="role" value={role} />}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-portal-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Name, email, phone, business…"
              className="pl-8 pr-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none focus:border-portal-blue bg-white min-w-[260px]"
            />
          </div>
        </form>
      </div>

      {contactsTableMissing && (
        <div className="bg-portal-amber-lt border-b border-amber-200 px-6 py-3 text-sm text-amber-900 inline-flex items-center gap-2">
          <AlertTriangle size={14} /> Multi-contact support pending — apply migration 128 (advertiser_contacts) in Supabase.
        </div>
      )}

      {/* ── List ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-portal-sub">
            {query ? <>No contacts match &ldquo;{query}&rdquo;.</> : 'No contacts in this view.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-portal-bg sticky top-0 border-b border-portal-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-portal-sub">
                <th className="px-6 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const biz = bizMap.get(c.advertiser_account_id)
                return (
                  <tr key={c.id} className="border-b border-portal-border hover:bg-portal-bg">
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/advertisers/${c.advertiser_account_id}`}
                        className="font-bold text-portal-text hover:text-portal-blue inline-flex items-center gap-1.5"
                      >
                        {c.name}
                        {c.is_primary && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-portal-amber">
                            <Star size={9} className="fill-amber-500 text-portal-amber" /> Primary
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/advertisers/${c.advertiser_account_id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-portal-text hover:text-portal-blue"
                      >
                        <Building2 size={12} className="text-gray-300" />
                        {biz?.business_name ?? '(unknown business)'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ROLE_BADGE[c.role] ?? ROLE_BADGE.other}`}>
                        {ROLE_LABEL[c.role] ?? c.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="text-portal-blue hover:underline inline-flex items-center gap-1">
                          <Mail size={10} /> {c.email}
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-portal-text hover:text-portal-text inline-flex items-center gap-1">
                          <Phone size={10} /> {c.phone}
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="bg-white border-t border-portal-border px-6 py-2 text-xs text-portal-sub">
          {filtered.length} contact{filtered.length === 1 ? '' : 's'} shown
          {filtered.length !== contacts.length && ` (of ${contacts.length} total)`}
        </div>
      )}
    </div>
  )
}
