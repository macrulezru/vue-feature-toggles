import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import type { FeatureTogglesOptions } from '../src/core/types'

export type NuxtFeatureTogglesOptions = Omit<FeatureTogglesOptions, 'loader'>

declare module '@nuxt/schema' {
  interface NuxtConfig {
    featureToggles?: NuxtFeatureTogglesOptions
  }
  interface NuxtOptions {
    featureToggles?: NuxtFeatureTogglesOptions
  }
}

export default defineNuxtModule<NuxtFeatureTogglesOptions>({
  meta: {
    name: 'vue-feature-toggles',
    configKey: 'featureToggles',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    flags: {},
    defaultValue: false,
    urlPrefix: 'feature',
    urlOverrides: process.env.NODE_ENV !== 'production',
    reloadInterval: 0,
  },
  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.featureToggles = {
      flags:          options.flags ?? {},
      defaultValue:   options.defaultValue ?? false,
      urlOverrides:   options.urlOverrides,
      urlPrefix:      options.urlPrefix ?? 'feature',
      reloadInterval: options.reloadInterval ?? 0,
    }

    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
