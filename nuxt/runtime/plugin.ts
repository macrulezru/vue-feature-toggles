import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from '../../src/core/FeatureProvider'
import Feature from '../../src/components/Feature.vue'
import { vFeature } from '../../src/directives/vFeature'
import type { NuxtFeatureTogglesOptions } from '../module'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.featureToggles as NuxtFeatureTogglesOptions
  const provider = createFeatureProvider(config)

  nuxtApp.vueApp.provide(FEATURE_PROVIDER_KEY, provider)
  nuxtApp.vueApp.component('Feature', Feature)
  nuxtApp.vueApp.directive('feature', vFeature)

  return {
    provide: {
      // Access provider outside component setup: const { $featureToggles } = useNuxtApp()
      featureToggles: provider,
    },
  }
})
