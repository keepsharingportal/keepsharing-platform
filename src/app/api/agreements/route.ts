import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { onAdvertiserAgreementSigned } from '@/lib/ghl'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { info, lineItems, subtotal, grandTotal, signature } = body

  // Persist to Supabase
  try {
    const supabase = await createClient()
    await supabase.from('ad_agreements').insert({
      subject:              `${info.businessName} Ad Agreement`,
      billing_address:      `${info.billingStreet}, ${info.billingCity}, ${info.billingState} ${info.billingZip}`,
      line_items:           lineItems,
      subtotal:             subtotal,
      grand_total:          grandTotal,
      status:               'Signed',
      signature_name:       signature.name,
      signature_title:      signature.title,
      signature_timestamp:  signature.timestamp,
      created_at:           new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
  } catch { /* non-blocking */ }

  // GHL: create/update contact and trigger welcome sequence
  // Use the first line item's publication for location routing; fall back to RRP
  const publication: string = (lineItems as Array<{ publication?: string }>)[0]?.publication ?? 'RRP'
  await onAdvertiserAgreementSigned({
    contactName:  info.contactName ?? info.businessName,
    businessName: info.businessName,
    email:        info.email,
    phone:        info.phone ?? undefined,
    publication,
  })

  return NextResponse.json({ success: true })
}
