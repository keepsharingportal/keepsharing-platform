// POST /api/admin/me/mfa-recovery-codes
//
// Generate (or regenerate) a fresh set of 2FA recovery codes for the
// current user. The plaintext codes are returned ONCE in the response;
// the server only retains salted hashes. Subsequent calls invalidate any
// prior codes (atomic replace) so the user always has one canonical set.
//
// Called from /admin/settings/security after the user verifies their
// first TOTP factor, and also from a "regenerate" button if they want a
// fresh set.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { requireAal2 } from '@/lib/admin/mfa-gate'
import { recordAuditEvent } from '@/lib/admin/audit'
import { generateRecoveryCodes } from '@/lib/admin/mfa-recovery'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  // Generating recovery codes is itself a sensitive action — require AAL2.
  // The exception is the immediate-post-enrollment flow where the user just
  // verified a TOTP, but in that case their session is already aal2.
  const gate = await requireAal2()
  if (!gate.ok) return gate.response

  const { plaintext, salt, hashed } = generateRecoveryCodes()
  const sr = createAdminClient()
  const { error } = await sr
    .from('admin_users')
    .update({
      mfa_recovery_codes_hashed:        hashed,
      mfa_recovery_codes_salt:          salt,
      mfa_recovery_codes_generated_at:  new Date().toISOString(),
      // Reset "last used" when we generate a new batch.
      mfa_recovery_code_last_used_at:   null,
    })
    .eq('id', ctx.adminId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAuditEvent({
    ctx, req,
    action:       'admin_user.mfa_recovery_codes_generated',
    target_table: 'admin_users',
    target_id:    ctx.adminId,
    meta:         { count: plaintext.length },
  })

  return NextResponse.json({ ok: true, codes: plaintext })
}
