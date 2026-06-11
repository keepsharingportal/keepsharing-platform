// Google Search Console API client.
//
// Auth model: OAuth2 refresh token. Tokens are minted by the user via the
// Google OAuth Playground (developers.google.com/oauthplayground) selecting
// the Search Console API scope (https://www.googleapis.com/auth/webmasters.readonly),
// then pasted into /admin/integrations/search-console. The integration row
// holds the refresh token; access tokens are minted on demand and cached
// until expiry.
//
// Why not a server-side OAuth callback? It requires registering redirect
// URIs in Google Cloud Console per deployment URL. Refresh-token paste is
// simpler to ship, equally secure (the refresh token is the credential
// either way), and the integration row's shape lets us add a callback flow
// later without a schema change.
//
// API docs: developers.google.com/webmaster-tools/v1/searchanalytics/query

export interface GoogleOAuthCredentials {
  clientId:     string
  clientSecret: string
}

function credentialsFromEnv(): GoogleOAuthCredentials | null {
  const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export class SearchConsoleApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'SearchConsoleApiError'
  }
}

/** Mint a fresh access token from a refresh token. Returns the token +
 *  expiry timestamp so the caller can cache it. */
export async function mintAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const creds = credentialsFromEnv()
  if (!creds) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET must be set in env.')
  }
  const body = new URLSearchParams({
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new SearchConsoleApiError(res.status, `OAuth refresh failed: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { access_token: string; expires_in: number }
  const expiresAt = new Date(Date.now() + (json.expires_in - 60) * 1000) // -60s safety
  return { accessToken: json.access_token, expiresAt }
}

export interface SearchAnalyticsRow {
  query?:        string
  page?:         string
  date?:         string
  clicks:        number
  impressions:   number
  ctr:           number
  position:      number
}

interface QueryOpts {
  startDate:   string                            // YYYY-MM-DD
  endDate:     string
  dimensions:  Array<'query' | 'page' | 'date'>
  rowLimit?:   number                            // default 1000, max 25000
  startRow?:   number                            // for pagination
}

/** Call the search-analytics endpoint. Returns rows in the order they came
 *  from Google, with the requested dimensions as keys. */
export async function queryAnalytics(
  accessToken: string,
  propertyUrl: string,
  opts:        QueryOpts,
): Promise<SearchAnalyticsRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/searchAnalytics/query`
  const body = {
    startDate:  opts.startDate,
    endDate:    opts.endDate,
    dimensions: opts.dimensions,
    rowLimit:   opts.rowLimit ?? 1000,
    startRow:   opts.startRow ?? 0,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'content-type':  'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new SearchConsoleApiError(res.status, `searchAnalytics ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { rows?: Array<{ keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }> }
  const rows: SearchAnalyticsRow[] = []
  for (const r of json.rows ?? []) {
    const keys = r.keys ?? []
    const row: SearchAnalyticsRow = {
      clicks:      r.clicks,
      impressions: r.impressions,
      ctr:         r.ctr,
      position:    r.position,
    }
    opts.dimensions.forEach((dim, i) => {
      const v = keys[i]
      if (v === undefined) return
      if (dim === 'query') row.query = v
      else if (dim === 'page') row.page = v
      else if (dim === 'date') row.date = v
    })
    rows.push(row)
  }
  return rows
}

/** List sites the auth'd user can access — used by the connect flow to
 *  confirm the refresh token works + suggest a property to pick. */
export async function listSites(accessToken: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { 'authorization': `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new SearchConsoleApiError(res.status, `sites.list ${res.status}: ${txt.slice(0, 400)}`)
  }
  const json = await res.json() as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> }
  return json.siteEntry ?? []
}
