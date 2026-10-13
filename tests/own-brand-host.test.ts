import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOwnBrandHost } from '@/lib/markets'

test('accepts every brand host, with and without www', () => {
  for (const h of [
    'riverregionparents.com', 'www.riverregionparents.com',
    'greaterpensacolaparents.com', 'www.greaterpensacolaparents.com',
    'mobilebayparents.com', 'easternshoreparents.com',
    'auburnopelikaparents.com', 'riverregion50plus.com',
  ]) assert.equal(isOwnBrandHost(h), true, h)
})

test('accepts pre-launch staging subdomains on our parent domain', () => {
  assert.equal(isOwnBrandHost('gpp.keepsharing.com'), true)
  assert.equal(isOwnBrandHost('keepsharing.com'), true)
})

test('rejects a lookalike that merely starts with a brand slug — the SSRF case', () => {
  // brandFromHost accepts this (fine for routing, where we set the Host);
  // an allowlist fed by a query parameter must not.
  assert.equal(isOwnBrandHost('gpp.evil.com'), false)
  assert.equal(isOwnBrandHost('rrp.attacker.net'), false)
})

test('rejects suffix-confusion hosts', () => {
  assert.equal(isOwnBrandHost('evil-riverregionparents.com'), false)
  assert.equal(isOwnBrandHost('riverregionparents.com.evil.com'), false)
  assert.equal(isOwnBrandHost('notkeepsharing.com'), false)
})

test('rejects empty and malformed input', () => {
  assert.equal(isOwnBrandHost(null), false)
  assert.equal(isOwnBrandHost(undefined), false)
  assert.equal(isOwnBrandHost(''), false)
})

test('ignores a port', () => {
  assert.equal(isOwnBrandHost('gpp.keepsharing.com:443'), true)
})
