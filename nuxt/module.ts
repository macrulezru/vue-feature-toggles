import { defineNuxtModule, addPlugin, addImports, addTemplate, createResolver } from '@nuxt/kit'
import type { FeatureTogglesOptions } from '../src/core/types'

// `loader` and `rules` are function-valued and cannot survive JSON serialization
// into `runtimeConfig.public` like every other option — instead, when `configFile`
// is set, they're wired in as a real ESM import via a generated template (see
// `functionalOptionsTemplateFilename` below), consumed by the runtime plugin.
// `ssrState` is populated automatically from the SSR payload at runtime.
export type NuxtFeatureTogglesOptions = Omit<FeatureTogglesOptions, 'loader' | 'rules' | 'ssrState'> & {
  /**
   * Path to a module that default-exports `{ loader?, rules? }` — resolved
   * exactly as written, so use an alias (e.g. `~/feature-toggles.config`) or
   * a path relative to the project root. Omit if you don't need either.
   */
  configFile?: string
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    featureToggles?: NuxtFeatureTogglesOptions
  }
  interface NuxtOptions {
    featureToggles?: NuxtFeatureTogglesOptions
  }
}

export const functionalOptionsTemplateFilename = 'feature-toggles-functional-options.mjs'

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
      ...(options.schedule     ? { schedule: options.schedule }         : {}),
      ...(options.variables    ? { variables: options.variables }       : {}),
      ...(options.userId       ? { userId: options.userId }             : {}),
    }

    addTemplate({
      filename: functionalOptionsTemplateFilename,
      getContents: () =>
        options.configFile
          ? `export { default as functionalOptions } from ${JSON.stringify(options.configFile)}`
          : `export const functionalOptions = {}`,
    })

    const resolver = createResolver(import.meta.url)
    addPlugin(resolver.resolve('./runtime/plugin'))

    addImports([
      { name: 'useFeature',         from: 'vue-feature-toggles' },
      { name: 'useFeatureVariant',  from: 'vue-feature-toggles' },
      { name: 'useFeatureProvider', from: 'vue-feature-toggles' },
    ])
  },
})
