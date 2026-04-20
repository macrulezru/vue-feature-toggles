import { inject } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider } from '../core/types'

export function useFeatureProvider(): FeatureProvider {
  const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)
  if (!provider) {
    throw new Error(
      '[vue-feature-toggles] useFeatureProvider() must be called inside a component tree ' +
        'where the FeatureToggles plugin has been installed.',
    )
  }
  return provider
}
