// POST /api/admin/auth/mfa-recovery — verify a recovery code + reset MFA.
//
// Called from /admin/auth/recovery when a user has lost their TOTP device.
// The flow:
//   1. The user is signed in (email/password worked) but stuck at AAL1.
//   2. They submit a recovery code.
//   3. Server validates the code (constant-time compare against the
//      hashed array stored on admin_users).
//   4. On success: ALL of the user's MFA factors are unenrolled via the
//      Supabase Auth admin API, the mfa_enabled_at stamp is cleared, and
//      the consumed recovery code is popped from the array.
//   5. The user is now an unenrolled admin and the layout MFA-enrollment
//      gate sends them to /admin/settings/security to set up a fresh
//      TOTP factor.
//
// Why this design: trading a recovery code for "full MFA reset + must
// re-enroll" contains the blast radius. A leaked recovery code locks the
// legit user out temporarily (they have to ask for a new code or use
// their other codes) but doesn't give the attacker a persistent path
// past 2FA — they have to enroll their own TOTP, which alerts the legit
// user on next sign-in attempt.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminContext } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { findMatchingCodeIndex } from '@/lib/admin/mfa-recovery'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Aggressive rate limit on this endpoint — a recovery code is one of
  // exactly 8 strings, and brute force is the realistic attack. 5/min per
  // IP means an attacker gets at most 7,200 guesses per day against a
  // 30-character × 10-char alphabet (10^14 keyspace minimum) — useless.
  const allowed = await checkRateLimit({ scope: 'admin.mfa_recovery', req, max: 5 })
  if (!allowed) return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 })

  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { code?: string }
  const submitted = body.code?.trim()
  if (!submitted) return NextResponse.json({ error: 'code_required' }, { status: 400 })

  const sr = createAdminClient()
  const { data, error: loadErr } = await sr
    .from('admin_users')
    .select('mfa_recovery_codes_hashed, mfa_recovery_codes_salt')
    .eq('id', ctx.adminId)
    .maybeSingle()
  if (loadErr) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  const row = data as { mfa_recovery_codes_hashed: string[] | null; mfa_recovery_codes_salt: string | null } | null
  if (!row || !row.mfa_recovery_codes_salt || !row.mfa_recovery_codes_hashed?.length) {
    return NextResponse.json({ error: 'no_recovery_codes_configured' }, { status: 400 })
  }

  const matchIndex = findMatchingCodeIndex(submitted, row.mfa_recovery_codes_hashed, row.mfa_recovery_codes_salt)
  if (matchIndex === -1) {
    await recordAuditEvent({
      ctx, req,
      action:       'admin_user.mfa_recovery_failed',
      target_table: 'admin_users',
      target_id:    ctx.adminId,
    })
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 })
  }

  // Consume the code AND wipe MFA factors. Atomic from the application's
  // perspective: even if the auth.admin.mfa call fails, the code is still
  // consumed (we can't take it back), so the user uses a different one
  // OR contacts support — neither path leaves the attacker with a working
  // code.
  const remaining = row.mfa_recovery_codes_hashed.filter((_, i) => i !== matchIndex)
  await sr.from('admin_users').update({
    mfa_recovery_codes_hashed:       remaining,
    mfa_recovery_code_last_used_at:  new Date().toISOString(),
    mfa_enabled_at:                  null,
  }).eq('id', ctx.adminId)

  let factorWipeError: string | null = null
  try {
    const { data: factorsData, error: listErr } = await sr.auth.admin.mfa.listFactors({ userId: ctx.userId })
    if (listErr) throw listErr
    for (const f of factorsData?.factors ?? []) {
      const { error: delErr } = await sr.auth.admin.mfa.deleteFactor({ userId: ctx.userId, id: f.id })
      if (delErr) throw delErr
    }
  } catch (e) {
    factorWipeError = e instanceof Error ? e.message : String(e)
    console.error('[mfa-recovery] factor wipe failed', factorWipeError)
  }

  await recordAuditEvent({
    ctx, req,
    action:       'admin_user.mfa_recovery_used',
    target_table: 'admin_users',
    target_id:    ctx.adminId,
    meta:         {
      codes_remaining: remaining.length,
      factor_wipe_error: factorWipeError,
    },
  })

  // The user is now unenrolled. The layout gate redirects them to
  // /admin/settings/security to set up a fresh TOTP factor.
  return NextResponse.json({
    ok: true,
    redirect: '/admin/settings/security?recovery=true',
    codes_remaining: remaining.length,
    factor_wipe_error: factorWipeError,
  })
}
