import { NextRequest, NextResponse } from 'next/server'
import { zipToNeighborhood } from '@/lib/neighborhood'

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp    = req.headers.get('x-real-ip')
    const ip        = (forwarded?.split(',')[0] ?? realIp ?? '').trim()

    // Localhost / private ranges → default
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({ neighborhood: 'montgomery', zip: null, source: 'local' })
    }

    const geo = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'KeepSharing/1.0 neighborhood-detection' },
      signal: AbortSignal.timeout(3000),
    })

    if (!geo.ok) throw new Error('geo api error')

    const data = await geo.json() as { postal?: string; city?: string }
    const zip  = data.postal ?? ''
    const neighborhood = zipToNeighborhood(zip)

    return NextResponse.json({ neighborhood, zip, source: 'ip' })
  } catch {
    return NextResponse.json({ neighborhood: 'montgomery', zip: null, source: 'fallback' })
  }
}
