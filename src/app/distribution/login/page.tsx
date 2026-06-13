// /distribution/login — driver + distribution-portal sign in.
//
// Matches the legacy drivers.keepsharing.com aesthetic (navy gradient,
// white card, DM Sans) so drivers see a familiar screen. Three sign-in
// paths, fastest first:
//
//   1. Email + password — the legacy default. Drivers expect this.
//   2. Send me a one-time link — fallback when password is forgotten
//      or never set. Replaces the legacy forgot-password flow with a
//      simpler magic-link instead of a token-and-form round trip.
//   3. Reset my password — sends a Supabase password-reset email.
//
// After auth, the driver lands on `?next=…` (passed by the gate on the
// driver portal). If they hit /distribution/login directly with no
// next, we look up their circulation_drivers.market and redirect to
// /distribution/<market>/driver so the experience feels seamless.

import { Suspense } from 'react'
import { DistributionLoginClient } from './DistributionLoginClient'

export const metadata = { title: 'Sign in — Distribution Portal' }
export const dynamic  = 'force-dynamic'

export default function DistributionLoginPage() {
  return (
    <Suspense fallback={null}>
      <DistributionLoginClient />
    </Suspense>
  )
}
