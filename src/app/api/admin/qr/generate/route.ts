// POST /api/admin/qr/generate
//
// Generates a QR code image (PNG, base64 data URL) for any content.
// Used by the Short Links admin for the inline preview + download.
//
// Body: {
//   text:          string,     // the content to encode (URL, tel:, mailto:, plain text, etc.)
//   size?:         number,     // pixel dimension (default 800 — print-quality)
//   primaryColor?: string,     // QR module color (default coral #ef6442)
//   bgColor?:      string,     // background (default white)
//   logoUrl?:      string,     // optional center logo URL
// }
//
// Returns: { dataUrl: string } — PNG as a data: URL. The client renders it
// in an <img> for preview and offers it as a download.

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime     = 'nodejs'
export const maxDuration = 30

interface Body {
  text?:          string
  size?:          number
  primaryColor?:  string
  bgColor?:       string
  logoUrl?:       string
}

export async function POST(req: NextRequest) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const text         = body.text.trim()
  const size         = Math.min(body.size ?? 800, 2000) // cap at 2000px
  const primaryColor = body.primaryColor ?? '#ef6442'
  const bgColor      = body.bgColor ?? '#ffffff'

  try {
    // Generate the QR as a PNG buffer
    const qrBuffer = await QRCode.toBuffer(text, {
      type:            'png',
      width:           size,
      margin:          2,
      errorCorrectionLevel: 'H', // High error correction so logo overlay doesn't break scanning
      color: {
        dark:  primaryColor,
        light: bgColor,
      },
    })

    let finalBuffer = qrBuffer

    // If a logo URL is provided, overlay it at the center (~20% of the QR).
    // High error correction (H) tolerates up to 30% obstruction, so 20% is
    // safe. The logo is fetched, resized to fit, placed on a white circle
    // background, and composited onto the QR.
    if (body.logoUrl) {
      try {
        const logoSize = Math.round(size * 0.2)
        const padSize  = Math.round(logoSize * 1.15) // white circle slightly bigger than logo

        // Fetch the logo
        const logoRes = await fetch(body.logoUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'RRP/1.0 (qr-logo-fetch)' },
        })
        if (logoRes.ok) {
          const logoBuf = Buffer.from(await logoRes.arrayBuffer())

          // Resize logo to fit
          const logoResized = await sharp(logoBuf)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toBuffer()

          // Create a white circle background for the logo
          const circleSvg = Buffer.from(
            `<svg width="${padSize}" height="${padSize}">
              <circle cx="${padSize / 2}" cy="${padSize / 2}" r="${padSize / 2}" fill="white"/>
            </svg>`,
          )
          const circleWithLogo = await sharp(circleSvg)
            .composite([{
              input: logoResized,
              top:   Math.round((padSize - logoSize) / 2),
              left:  Math.round((padSize - logoSize) / 2),
            }])
            .png()
            .toBuffer()

          // Composite onto QR center
          finalBuffer = await sharp(qrBuffer)
            .composite([{
              input: circleWithLogo,
              top:   Math.round((size - padSize) / 2),
              left:  Math.round((size - padSize) / 2),
            }])
            .png()
            .toBuffer()
        }
      } catch {
        // Logo fetch/overlay failed — return QR without logo rather than failing
      }
    }

    const dataUrl = `data:image/png;base64,${finalBuffer.toString('base64')}`
    return NextResponse.json({ dataUrl })
  } catch (e) {
    console.error('[admin/qr/generate] error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'QR generation failed' },
      { status: 500 },
    )
  }
}
