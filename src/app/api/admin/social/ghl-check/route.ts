// GET /api/admin/social/ghl-check?brand=rrp
// Calls listSocialAccounts on the brand's PIT and reports back whether
// the social-media-posting scope is wired up + which accounts are
// connected. Used by the admin diagnostic page before bulk operations.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { checkSocialPlannerScope, listSocialAccounts } from '@/lib/ghl-social'
import { MARKETS } from '@/lib/markets'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  await requireSettingsAccess()
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand')

  if (brand) {
    const [scope, accounts] = await Promise.all([
      checkSocialPlannerScope(brand),
      listSocialAccounts(brand),
    ])
    return NextResponse.json({
      brand,
      scope,
      accounts: accounts.ok ? accounts.accounts : [],
      error:    accounts.ok ? undefined : accounts.error,
    })
  }

  // No brand specified — run the check across every brand.
  const results = await Promise.all(MARKETS.map(async m => {
    const scope    = await checkSocialPlannerScope(m.slug)
    const accounts = scope.ok ? await listSocialAccounts(m.slug) : { ok: false, accounts: [], error: scope.error }
    return {
      brand:    m.slug,
      label:    m.displayName,
      scope,
      accounts: accounts.ok ? accounts.accounts : [],
      error:    accounts.ok ? undefined : accounts.error,
    }
  }))
  return NextResponse.json({ brands: results })
}
