import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, subjectName, subjectEmail, subjectPhone, nominatorName, nominatorEmail, nominatorPhone, q1, q2, q3, publication } = body

  try {
    const supabase = await createClient()
    await supabase.from('nominations').insert({
      type, subject_name: subjectName, subject_email: subjectEmail ?? null, subject_phone: subjectPhone ?? null,
      nominator_name: nominatorName, nominator_email: nominatorEmail, nominator_phone: nominatorPhone ?? null,
      reason: [q1, q2, q3].filter(Boolean).join('\n\n'),
      status: 'pending', publication, submitted_at: new Date().toISOString(),
    })
    await supabase.from('notifications').insert({
      type:    'nomination_received',
      title:   `New nomination — ${subjectName}`,
      body:    `${type} nomination from ${nominatorName}`,
      urgency: 'incoming',
      publication,
      metadata: { type, subjectName, nominatorName, nominatorEmail },
    })
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true })
}
