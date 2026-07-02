// POST /api/admin/circulation/deliveries/ack
//
// Sets a cookie stamping the moment the admin last opened the
// Deliveries page. The counts endpoint reads this and filters
// pending_deliveries to items submitted AFTER the ack timestamp
// so the red sidebar badge clears immediately on visit — even
// though the underlying submitted deliveries may still be pending
// mark-paid (all routes haven't been delivered yet).
//
// New submissions after the ack timestamp still show a badge so the
// admin knows something new came in.

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

const COOKIE_NAME = 'circulation_deliveries_ack_at'

export async function POST() {
  await requireAdmin()
  const nowIso = new Date().toISOString()
  const res = NextResponse.json({ ok: true, ack_at: nowIso })
  res.cookies.set(COOKIE_NAME, nowIso, {
    path:     '/',
    httpOnly: false, // client can read to sync locally if it wants
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 30, // 30 days — plenty for a monthly workflow
  })
  return res
}
