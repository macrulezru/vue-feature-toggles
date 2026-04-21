import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import type { FeatureTogglesOptions } from '../src/core/types'

export type NuxtFeatureTogglesOptions = Omit<FeatureTogglesOptions, 'loader' | 'ssrState'>

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
      // Optional fields passed through as-is
      ...(options.liveUpdates  ? { liveUpdates: options.liveUpdates }   : {}),
      ...(options.groups       ? { groups: options.groups }             : {}),
      ...(options.dependencies ? { dependencies: options.dependencies } : {}),
      ...(options.meta         ? { meta: options.meta }                 : {}),
      ...(options.expiry       ? { expiry: options.expiry }             : {}),
    }

    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
