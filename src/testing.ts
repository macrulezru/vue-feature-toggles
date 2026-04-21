/**
 * Testing utilities for vue-feature-toggles.
 * Import from 'vue-feature-toggles/testing' — excluded from the production bundle.
 *
 * @example
 * import { withFeatures, setTestFlag } from 'vue-feature-toggles/testing'
 *
 * // Pass as second arg to VTU mount():
 * const wrapper = mount(MyComponent, withFeatures({ betaSearch: true }))
 *
 * // Change a flag mid-test and wait for DOM update:
 * await setTestFlag('betaSearch', false)
 */
import { nextTick } from 'vue'
import type { App } from 'vue'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from './core/FeatureProvider'
import type { FlagValue, FeatureProvider, FeatureTogglesOptions } from './core/types'

// Module-level ref to the most recently created test provider.
// setTestFlag() operates on this provider.
let _currentProvider: FeatureProvider | null = null

/**
 * Creates a Vue plugin that installs a test feature provider with the given flags.
 * Use directly in `global.plugins` when you need access to the plugin object.
 */
export function createTestFeatureProvider(
  flags: Record<string, FlagValue> = {},
  options: Omit<FeatureTogglesOptions, 'flags' | 'loader' | 'reloadInterval'> = {},
) {
  const provider = createFeatureProvider({ ...options, flags })
  _currentProvider = provider

  return {
    install(app: App) {
      app.provide(FEATURE_PROVIDER_KEY, provider)
    },
    /** Direct access to the provider for advanced assertions. */
    provider,
  }
}

/**
 * Returns VTU `mount()` options with a feature provider pre-installed.
 *
 * @example
 * const wrapper = mount(MyComponent, withFeatures({ betaSearch: true }))
 */
export function withFeatures(
  flags: Record<string, FlagValue> = {},
  options: Omit<FeatureTogglesOptions, 'flags' | 'loader' | 'reloadInterval'> = {},
) {
  return {
    global: {
      plugins: [createTestFeatureProvider(flags, options)],
    },
  }
}

/**
 * Updates a flag on the active test provider and waits for Vue to flush DOM updates.
 * Must be called after withFeatures() or createTestFeatureProvider().
 *
 * @example
 * await setTestFlag('betaSearch', false)
 * expect(wrapper.find('[data-testid="beta"]').exists()).toBe(false)
 */
export async function setTestFlag(name: string, value: FlagValue): Promise<void> {
  if (!_currentProvider) {
    throw new Error(
      '[vue-feature-toggles/testing] No active provider. Call withFeatures() or createTestFeatureProvider() first.',
    )
  }
  if (typeof value === 'boolean') _currentProvider.setFlag(name, value)
  else _currentProvider.setVariant(name, value)
  return nextTick()
}

/**
 * Resets all test state between test suites. Call in afterEach/afterAll.
 */
export function resetTestProvider(): void {
  _currentProvider = null
}
