// 2FA recovery code generation + validation.
//
// Codes are 8 codes × 10 chars from a 32-character alphabet that avoids
// look-alikes (0/O, 1/I/l), formatted as XXXX-XXXX. Stored as salted
// SHA-256 hashes so a DB compromise can't recover the plaintext. Each
// code is consumed (popped from the array) on successful validation,
// making it strictly single-use.
//
// The recovery flow itself is intentionally destructive: validating a
// recovery code triggers a full MFA reset (all factors removed via the
// Supabase Auth admin API). The user is then forced through fresh TOTP
// enrollment before they regain AAL2. This means a leaked recovery code
// is bad but contained — it can lock the legit user out temporarily, not
// give the attacker a persistent backdoor.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'   // no 0/O/1/I/l
const CODE_COUNT  = 8
const CODE_LENGTH = 10

function randomCode(): string {
  const buf = randomBytes(CODE_LENGTH)
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[buf[i] % ALPHABET.length]
  return `${out.slice(0, 5)}-${out.slice(5)}`
}

function hashCode(code: string, salt: string): string {
  return createHash('sha256').update(`${normalize(code)}:${salt}`).digest('hex')
}

function normalize(code: string): string {
  // Strip whitespace + dashes + uppercase so users entering 'abcd-efgh'
  // or 'ABCDEFGH' match the hash either way.
  return code.replace(/[\s-]/g, '').toUpperCase()
}

export interface GeneratedCodes {
  /** The plaintext codes, formatted with dashes, to display to the user
   *  exactly once. */
  plaintext: string[]
  /** The salt to store on admin_users.mfa_recovery_codes_salt. */
  salt:      string
  /** The hashed codes to store on admin_users.mfa_recovery_codes_hashed. */
  hashed:    string[]
}

export function generateRecoveryCodes(): GeneratedCodes {
  const salt = randomBytes(16).toString('hex')
  const plaintext: string[] = []
  const hashed: string[] = []
  const seen = new Set<string>()
  while (plaintext.length < CODE_COUNT) {
    const c = randomCode()
    if (seen.has(c)) continue
    seen.add(c)
    plaintext.push(c)
    hashed.push(hashCode(c, salt))
  }
  return { plaintext, salt, hashed }
}

/** Find a matching code in the hashed array using a constant-time compare.
 *  Returns the INDEX of the match (so the caller can remove it from the
 *  array) or -1 if no match. */
export function findMatchingCodeIndex(submitted: string, hashed: string[], salt: string): number {
  if (!salt || hashed.length === 0) return -1
  const target = Buffer.from(hashCode(submitted, salt), 'hex')
  for (let i = 0; i < hashed.length; i++) {
    let candidate: Buffer
    try { candidate = Buffer.from(hashed[i], 'hex') } catch { continue }
    if (candidate.length !== target.length) continue
    if (timingSafeEqual(candidate, target)) return i
  }
  return -1
}
