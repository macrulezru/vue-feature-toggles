import type { FeatureProvider, FlagValue } from './core/types'

/**
 * Serializes the current provider flag state for SSR hydration.
 *
 * Server-side example (generic):
 *   const snapshot = serializeFlags(provider)
 *   // embed in HTML: window.__FEATURE_FLAGS__ = JSON.stringify(snapshot)
 *
 * Client-side:
 *   app.use(FeatureToggles, { ssrState: window.__FEATURE_FLAGS__, loader })
 */
export function serializeFlags(provider: FeatureProvider): Record<string, FlagValue> {
  return provider.serialize()
}
