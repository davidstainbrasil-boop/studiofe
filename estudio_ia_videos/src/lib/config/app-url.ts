const DEFAULT_PRODUCTION_ORIGIN = 'https://cursostecno.com.br'
const DEFAULT_LOCAL_ORIGIN = 'http://localhost:3000'

const ORIGIN_ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXTAUTH_URL'] as const

function normalizeAbsoluteUrl(value: string | null | undefined): URL | null {
  if (!value) return null

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed
  } catch {
    return null
  }
}

function normalizeOrigin(value: string | null | undefined): string | null {
  const parsed = normalizeAbsoluteUrl(value)
  if (!parsed) return null
  return `${parsed.protocol}//${parsed.host}`
}

export function getCanonicalProductionOrigin(): string {
  return DEFAULT_PRODUCTION_ORIGIN
}

export function getDefaultLocalOrigin(): string {
  return DEFAULT_LOCAL_ORIGIN
}

export function getConfiguredAppOrigin(): string | null {
  for (const key of ORIGIN_ENV_KEYS) {
    const origin = normalizeOrigin(process.env[key])
    if (origin) return origin
  }

  return null
}

export function getAppOrigin(options?: { requestUrl?: string | URL; fallbackToRequest?: boolean }): string {
  const configuredOrigin = getConfiguredAppOrigin()
  if (configuredOrigin) return configuredOrigin

  if (options?.fallbackToRequest && options.requestUrl) {
    const requestOrigin = normalizeOrigin(
      typeof options.requestUrl === 'string' ? options.requestUrl : options.requestUrl.toString()
    )
    if (requestOrigin) return requestOrigin
  }

  return process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_ORIGIN : DEFAULT_LOCAL_ORIGIN
}

export function getAllowedOriginsFromEnv(): string[] | null {
  if (!process.env.ALLOWED_ORIGINS) return null

  const origins = process.env.ALLOWED_ORIGINS.split(',')
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value))

  return origins.length > 0 ? Array.from(new Set(origins)) : null
}

export function getSecurityAllowedOrigins(): string[] {
  const configured = getAllowedOriginsFromEnv()
  if (configured) return configured

  const appOrigin = getAppOrigin()
  const defaults =
    process.env.NODE_ENV === 'production'
      ? [appOrigin, DEFAULT_PRODUCTION_ORIGIN]
      : [appOrigin, DEFAULT_LOCAL_ORIGIN]

  return Array.from(new Set(defaults))
}

function isSafeRelativePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//')
}

export function resolveTrustedAppUrl(
  value: string | null | undefined,
  options?: { baseOrigin?: string; fallbackPath?: string }
): string {
  const baseOrigin = normalizeOrigin(options?.baseOrigin) ?? getAppOrigin()
  const fallbackPath = options?.fallbackPath && isSafeRelativePath(options.fallbackPath) ? options.fallbackPath : '/'
  const fallbackUrl = new URL(fallbackPath, `${baseOrigin}/`).toString()

  if (!value) return fallbackUrl
  const trimmed = value.trim()
  if (!trimmed) return fallbackUrl

  if (isSafeRelativePath(trimmed)) {
    return new URL(trimmed, `${baseOrigin}/`).toString()
  }

  const absolute = normalizeAbsoluteUrl(trimmed)
  if (!absolute || absolute.origin !== baseOrigin) return fallbackUrl

  absolute.hash = ''
  return absolute.toString()
}
