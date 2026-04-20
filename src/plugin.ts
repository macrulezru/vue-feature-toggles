import type { App, Plugin } from 'vue'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from './core/FeatureProvider'
import Feature from './components/Feature.vue'
import { vFeature } from './directives/vFeature'
import type { FeatureTogglesOptions } from './core/types'

export const FeatureToggles: Plugin = {
  install(app: App, options: FeatureTogglesOptions = {}) {
    const provider = createFeatureProvider(options)
    app.provide(FEATURE_PROVIDER_KEY, provider)
    app.component('Feature', Feature)
    app.directive('feature', vFeature)
  },
}
