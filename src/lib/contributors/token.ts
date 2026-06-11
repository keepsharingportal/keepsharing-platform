// Magic-link tokens for contributor invites.
//
// 256-bit cryptographically random, base64url-encoded. Same shape as
// the advertiser report public tokens — proven pattern.

import { randomBytes } from 'node:crypto'

export function mintContributorToken(): string {
  return randomBytes(32).toString('base64url')
}
