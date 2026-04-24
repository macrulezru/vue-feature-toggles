import type { FlagValue } from './core/types'

// ---------------------------------------------------------------------------
// LaunchDarkly
// ---------------------------------------------------------------------------

export interface LaunchDarklyOptions {
  /** Client-side SDK key from the LaunchDarkly dashboard */
  clientSideId: string
  /** User / context object for flag evaluation */
  user: { key: string; [key: string]: unknown }
  /** Base URL override for relay proxies. Default: https://app.launchdarkly.com */
  baseUrl?: string
}

/**
 * Creates a loader that fetches flag evaluations from LaunchDarkly.
 *
 * @example
 * app.use(FeatureToggles, {
 *   loader: launchDarklyLoader({
 *     clientSideId: 'your-client-side-id',
 *     user: { key: userId },
 *   }),
 * })
 */
export function launchDarklyLoader(opts: LaunchDarklyOptions): () => Promise<Record<string, FlagValue>> {
  return async () => {
    const base = opts.baseUrl ?? 'https://app.launchdarkly.com'
    const userB64 = btoa(JSON.stringify(opts.user))
    const res = await fetch(
      `${base}/sdk/evalx/${opts.clientSideId}/users/${userB64}`,
      { headers: { Authorization: opts.clientSideId } },
    )
    if (!res.ok) throw new Error(`[vue-feature-toggles] LaunchDarkly fetch failed: ${res.status}`)
    const data = await res.json() as Record<string, { value: FlagValue }>
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.value ?? false]),
    )
  }
}

// ---------------------------------------------------------------------------
// Unleash
// ---------------------------------------------------------------------------

export interface UnleashOptions {
  /** Unleash API URL, e.g. https://your-unleash.example.com/api */
  url: string
  appName: string
  clientKey: string
  /** Optional user ID for toggle evaluation context */
  userId?: string
}

/**
 * Creates a loader that fetches feature toggles from an Unleash instance.
 *
 * @example
 * app.use(FeatureToggles, {
 *   loader: unleashLoader({
 *     url: 'https://unleash.example.com/api',
 *     appName: 'my-app',
 *     clientKey: 'default:development.abc123',
 *   }),
 * })
 */
export function unleashLoader(opts: UnleashOptions): () => Promise<Record<string, FlagValue>> {
  return async () => {
    const headers: Record<string, string> = {
      Authorization: opts.clientKey,
      'UNLEASH-APPNAME': opts.appName,
      'Content-Type': 'application/json',
    }
    if (opts.userId) headers['UNLEASH-INSTANCEID'] = opts.userId

    const res = await fetch(`${opts.url}/client/features`, { headers })
    if (!res.ok) throw new Error(`[vue-feature-toggles] Unleash fetch failed: ${res.status}`)

    const { features } = await res.json() as {
      features: Array<{ name: string; enabled: boolean; variants?: Array<{ name: string; enabled: boolean }> }>
    }

    const result: Record<string, FlagValue> = {}
    for (const feature of features) {
      // If there are enabled variants, use the first enabled variant name as the value
      const enabledVariant = feature.variants?.find(v => v.enabled)
      result[feature.name] = enabledVariant ? enabledVariant.name : feature.enabled
    }
    return result
  }
}

// ---------------------------------------------------------------------------
// Flagsmith
// ---------------------------------------------------------------------------

export interface FlagsmithOptions {
  /** Environment API key from Flagsmith dashboard */
  apiKey: string
  /** Base API URL. Default: https://edge.api.flagsmith.com/api/v1 */
  apiUrl?: string
  /** Optional identity for per-user flag evaluation */
  identity?: string
}

/**
 * Creates a loader that fetches feature flags from Flagsmith.
 *
 * @example
 * app.use(FeatureToggles, {
 *   loader: flagsmithLoader({
 *     apiKey: 'ser.your-api-key',
 *     identity: userId,
 *   }),
 * })
 */
export function flagsmithLoader(opts: FlagsmithOptions): () => Promise<Record<string, FlagValue>> {
  return async () => {
    const base = opts.apiUrl ?? 'https://edge.api.flagsmith.com/api/v1'
    const url  = opts.identity
      ? `${base}/identities/?identifier=${encodeURIComponent(opts.identity)}`
      : `${base}/flags/`

    const res = await fetch(url, {
      headers: { 'X-Environment-Key': opts.apiKey },
    })
    if (!res.ok) throw new Error(`[vue-feature-toggles] Flagsmith fetch failed: ${res.status}`)

    const json = await res.json()

    // Identity endpoint returns { flags: [...] }, flags endpoint returns [...]
    const flags: Array<{ feature: { name: string }; enabled: boolean; feature_state_value: unknown }> =
      opts.identity ? (json as { flags: typeof flags }).flags : json

    return Object.fromEntries(
      flags.map(f => [
        f.feature.name,
        // Use feature_state_value as variant if it's a non-empty string, otherwise enabled boolean
        typeof f.feature_state_value === 'string' && f.feature_state_value
          ? f.feature_state_value
          : f.enabled,
      ]),
    )
  }
}
