/**
 * Storybook 7/8 decorator for vue-feature-toggles.
 * Import from 'vue-feature-toggles/storybook' — excluded from the production bundle.
 *
 * @example .storybook/preview.ts
 * import { withFeatureToggles } from 'vue-feature-toggles/storybook'
 * export const decorators = [withFeatureToggles()]
 *
 * @example MyComponent.stories.ts
 * export const WithBetaSearch: Story = {
 *   parameters: {
 *     featureToggles: { betaSearch: true, newDashboard: false },
 *   },
 * }
 */
import { defineComponent, provide, h } from 'vue'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from './core/FeatureProvider'
import Feature from './components/Feature.vue'
import FeatureVariant from './components/FeatureVariant.vue'
import { vFeature } from './directives/vFeature'
import type { FlagValue, FeatureTogglesOptions } from './core/types'

/**
 * Creates a Storybook decorator that wraps every story with a FeatureToggles provider.
 *
 * @param defaultFlags  Flags applied to all stories in the file / globally.
 * @param options       Any FeatureTogglesOptions except flags and loader.
 *
 * Per-story flags are merged on top of defaultFlags via `parameters.featureToggles`.
 */
export function withFeatureToggles(
  defaultFlags: Record<string, FlagValue> = {},
  options: Omit<FeatureTogglesOptions, 'flags' | 'loader'> = {},
) {
  return (story: any, context: any) => {
    const storyFlags: Record<string, FlagValue> = context?.parameters?.featureToggles ?? {}
    const flags = { ...defaultFlags, ...storyFlags }

    return defineComponent({
      name: 'FeatureTogglesDecorator',
      components: { Feature, FeatureVariant },
      directives: { feature: vFeature },
      setup() {
        const provider = createFeatureProvider({ ...options, flags })
        provide(FEATURE_PROVIDER_KEY, provider)
        return {}
      },
      render() {
        return h(story)
      },
    })
  }
}
