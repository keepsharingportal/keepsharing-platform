// ── IndexNow key verification endpoint ──────────────────────────────────────
//
// IndexNow requires us to host the key file at a URL we declare in the
// keyLocation parameter of each ping. Per spec, that URL can be any
// path — we use /indexnow/<key>.txt instead of the root /<key>.txt so
// the dynamic [key] segment doesn't accidentally catch other top-level
// routes.
//
// Bing / Yandex GET this file during the protocol handshake to verify
// we own the domain we're pinging from. Returns the configured
// INDEXNOW_KEY only when the requested filename matches it; 404
// otherwise.

import { getIndexNowKey } from '@/lib/seo/indexnow'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key: requested } = await params
  const key = getIndexNowKey()
  if (!key) return new Response('Not Found', { status: 404 })
  if (requested !== `${key}.txt`) return new Response('Not Found', { status: 404 })
  return new Response(key, {
    status:  200,
    headers: {
      'Content-Type':  'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=31536000, immutable',
    },
  })
}
