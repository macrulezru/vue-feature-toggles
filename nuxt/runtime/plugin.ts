import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from '../../src/core/FeatureProvider'
import Feature from '../../src/components/Feature.vue'
import FeatureVariant from '../../src/components/FeatureVariant.vue'
import { vFeature } from '../../src/directives/vFeature'
import type { NuxtFeatureTogglesOptions } from '../module'
import type { FlagValue } from '../../src/core/types'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.featureToggles as NuxtFeatureTogglesOptions

  // On client: restore server-side flag snapshot from Nuxt payload to prevent hydration mismatch
  const ssrState = import.meta.client
    ? ((nuxtApp.payload as Record<string, unknown>).featureFlags as Record<string, FlagValue> | undefined)
    : undefined

  const provider = createFeatureProvider({ ...config, ssrState })

  // On server: capture resolved flags after the page renders for payload embedding
  if (import.meta.server) {
    nuxtApp.hook('app:rendered', () => {
      ;(nuxtApp.payload as Record<string, unknown>).featureFlags = provider.serialize()
    })
  }

  nuxtApp.vueApp.provide(FEATURE_PROVIDER_KEY, provider)
  nuxtApp.vueApp.component('Feature', Feature)
  nuxtApp.vueApp.component('FeatureVariant', FeatureVariant)
  nuxtApp.vueApp.directive('feature', vFeature)

  return {
    provide: {
      // Access provider outside component setup: const { $featureToggles } = useNuxtApp()
      featureToggles: provider,
    },
  }
})
