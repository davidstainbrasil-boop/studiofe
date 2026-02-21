import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import {
  getAllowedOriginsFromEnv,
  getAppOrigin,
  getConfiguredAppOrigin,
  getSecurityAllowedOrigins,
  resolveTrustedAppUrl,
} from '@/lib/config/app-url'

const ORIGINAL_ENV = process.env

describe('app-url config helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.ALLOWED_ORIGINS
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('prioritizes NEXT_PUBLIC_SITE_URL when configured', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://cursostecno.com.br/path?x=1'
    process.env.NEXT_PUBLIC_APP_URL = 'https://another.example.com'

    expect(getConfiguredAppOrigin()).toBe('https://cursostecno.com.br')
  })

  it('falls back to localhost origin in non-production when env is missing', () => {
    expect(getAppOrigin()).toBe('http://localhost:3000')
  })

  it('falls back to canonical production origin in production when env is missing', () => {
    process.env.NODE_ENV = 'production'
    expect(getAppOrigin()).toBe('https://cursostecno.com.br')
  })

  it('can derive origin from request URL when configured', () => {
    expect(
      getAppOrigin({
        fallbackToRequest: true,
        requestUrl: 'https://cursostecno.com.br/api/stripe/checkout',
      })
    ).toBe('https://cursostecno.com.br')
  })

  it('parses and deduplicates ALLOWED_ORIGINS', () => {
    process.env.ALLOWED_ORIGINS =
      'https://cursostecno.com.br, https://cursostecno.com.br, invalid-url, http://localhost:3000'

    expect(getAllowedOriginsFromEnv()).toEqual(['https://cursostecno.com.br', 'http://localhost:3000'])
  })

  it('returns env-defined security origins when ALLOWED_ORIGINS is valid', () => {
    process.env.ALLOWED_ORIGINS = 'https://cursostecno.com.br'

    expect(getSecurityAllowedOrigins()).toEqual(['https://cursostecno.com.br'])
  })

  it('resolves relative app URLs against the app origin', () => {
    const url = resolveTrustedAppUrl('/dashboard?upgrade=success', {
      baseOrigin: 'https://cursostecno.com.br',
      fallbackPath: '/pricing',
    })

    expect(url).toBe('https://cursostecno.com.br/dashboard?upgrade=success')
  })

  it('keeps absolute URLs only when they match app origin', () => {
    const url = resolveTrustedAppUrl('https://cursostecno.com.br/dashboard?plan=pro#hash', {
      baseOrigin: 'https://cursostecno.com.br',
      fallbackPath: '/pricing',
    })

    expect(url).toBe('https://cursostecno.com.br/dashboard?plan=pro')
  })

  it('rejects cross-origin URLs and falls back to safe path', () => {
    const url = resolveTrustedAppUrl('https://evil.example.com/steal', {
      baseOrigin: 'https://cursostecno.com.br',
      fallbackPath: '/dashboard/billing',
    })

    expect(url).toBe('https://cursostecno.com.br/dashboard/billing')
  })

  it('falls back to root when fallbackPath is invalid', () => {
    const url = resolveTrustedAppUrl(undefined, {
      baseOrigin: 'https://cursostecno.com.br',
      fallbackPath: 'javascript:alert(1)',
    })

    expect(url).toBe('https://cursostecno.com.br/')
  })
})
