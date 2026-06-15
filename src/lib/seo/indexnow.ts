// ── IndexNow protocol — push URLs to search engines on publish ──────────────
//
// IndexNow is supported by Bing + Yandex (and proxied to other engines
// from there). When we publish a new article or event, we POST the URL
// to IndexNow and the search engine crawls it immediately instead of
// waiting for the next routine pass — sometimes minutes vs days for
// indexing.
//
// Requirements:
//   1. A key file hosted at /<key>.txt with the same key as content
//   2. POST { host, key, keyLocation, urlList } to api.indexnow.org
//
// Key is loaded from INDEXNOW_KEY env var. When unset, pings are no-ops
// so dev/staging never spam search engines. Brand-aware: each brand
// domain pings with its own host.

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow'

/** Get the configured IndexNow key. Returns null when unset — pings
 *  become no-ops in that case. */
export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY ?? null
}

/** Ping IndexNow with a batch of URLs. Up to 10k per request per the
 *  spec; we cap at 500 for safety. Best-effort fire-and-forget — never
 *  throws. */
export async function pingIndexNow(host: string, urls: string[]): Promise<{ ok: boolean; sent: number; error?: string }> {
  const key = getIndexNowKey()
  if (!key) return { ok: false, sent: 0, error: 'INDEXNOW_KEY not set' }
  if (urls.length === 0) return { ok: true, sent: 0 }

  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '')
  // Per IndexNow spec the keyLocation can be any URL we control. We
  // serve the key file from /indexnow/<key>.txt to avoid putting a
  // catch-all dynamic route at the application root.
  const keyLocation = `https://${cleanHost}/indexnow/${key}.txt`
  const urlList = urls.slice(0, 500)

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept:         'application/json',
      },
      body: JSON.stringify({
        host:        cleanHost,
        key,
        keyLocation,
        urlList,
      }),
    })
    if (!res.ok) {
      return { ok: false, sent: 0, error: `IndexNow returned ${res.status}` }
    }
    return { ok: true, sent: urlList.length }
  } catch (e) {
    return { ok: false, sent: 0, error: e instanceof Error ? e.message : 'IndexNow fetch failed' }
  }
}
