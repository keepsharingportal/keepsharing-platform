// Anonymous reader device token, stored in localStorage.
//
// Used to link a single device's favorites + engagement counters
// together without requiring an account. When the reader later
// subscribes to the newsletter (with a real email), the API links any
// pre-existing rows to their identity for cross-device reach.
//
// 22-char base64url (16 bytes of entropy). Not cryptographically
// sensitive — the only thing this protects is "I picked this device's
// favorites." Brute-forcing one wouldn't even be useful since the
// favorites are not private.

const STORAGE_KEY = 'rrp_reader_device_token'

function randomBase64Url(bytes: number): string {
  const arr = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr)
  // Older browsers without crypto.getRandomValues fall back to Math.random.
  // Cookie privacy isn't load-bearing here so this is fine.
  else for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function readDeviceToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    let token = window.localStorage.getItem(STORAGE_KEY)
    if (!token) {
      token = randomBase64Url(16)
      window.localStorage.setItem(STORAGE_KEY, token)
    }
    return token
  } catch {
    // Private-browsing / disabled storage — fall through to ephemeral.
    return ''
  }
}
