import { NextRequest, NextResponse } from 'next/server'
import { upsertContact } from '@/lib/ghl'

// GET /api/test/ghl-ping?pub=rrp
// Creates a test contact and returns the result. Safe to call repeatedly.
export async function GET(req: NextRequest) {
  const pub = req.nextUrl.searchParams.get('pub') ?? 'rrp'

  const result = await upsertContact({
    publicationSlug: pub,
    email:           'ghl-test@keepsharing.com',
    firstName:       'GHL',
    lastName:        'Test',
    businessName:    'KeepSharing Test',
    tags:            ['test-ping'],
  })

  return NextResponse.json({
    pub,
    ...result,
    timestamp: new Date().toISOString(),
    note: result.success
      ? 'Contact upserted — verify in GHL Contacts. Check integration_log in Supabase for the log entry.'
      : 'Call failed — check integration_log in Supabase for details.',
  })
}
