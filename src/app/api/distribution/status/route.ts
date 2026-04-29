import { NextResponse } from 'next/server'
import { getPortalStatus } from '@/lib/distribution-portal'

// Cache 5 minutes — portal data doesn't change second-by-second
export const revalidate = 300

export async function GET() {
  try {
    const status = await getPortalStatus()
    return NextResponse.json(status)
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
