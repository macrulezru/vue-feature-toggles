import type { Plugin } from 'vite'

export interface FeatureTogglesPluginOptions {
  /**
   * Automatically remove `<FeatureDevTools>` from templates in production builds.
   * Default: true
   */
  stripDevTools?: boolean
}

/**
 * Vite plugin for vue-feature-toggles.
 *
 * Removes `<FeatureDevTools>` from .vue templates and strips its import
 * statements during production builds — no need for `v-if="isDev"` wrappers.
 *
 * @example
 * // vite.config.ts
 * import { featureTogglesPlugin } from 'vue-feature-toggles/vite'
 *
 * export default defineConfig({
 *   plugins: [vue(), featureTogglesPlugin()],
 * })
 */
export function featureTogglesPlugin(options: FeatureTogglesPluginOptions = {}): Plugin {
  const { stripDevTools = true } = options
  let isBuild = false

  return {
    name: 'vue-feature-toggles',
    enforce: 'pre',

    configResolved(config) {
      isBuild = config.command === 'build'
    },

    transform(code, id) {
      if (!stripDevTools || !isBuild) return null
      if (!code.includes('FeatureDevTools')) return null
      if (!/\.(vue|ts|tsx|js|jsx|mts|mjs)$/.test(id)) return null

      let transformed = code

      // Remove self-closing usage: <FeatureDevTools ... />
      transformed = transformed.replace(/<FeatureDevTools\b[^>]*\/>/g, '')

      // Remove block usage: <FeatureDevTools ...>...</FeatureDevTools>
      transformed = transformed.replace(/<FeatureDevTools\b[^>]*>[\s\S]*?<\/FeatureDevTools>/g, '')

      // Remove import if it only imports FeatureDevTools
      transformed = transformed.replace(
        /^import\s+\{\s*FeatureDevTools\s*\}\s+from\s+['"][^'"]*['"]\s*;?\n?/gm,
        '',
      )

      // Remove FeatureDevTools from a multi-named import, e.g.:
      // import { Feature, FeatureDevTools, FeatureVariant } from '...'
      transformed = transformed.replace(
        /(import\s+\{[^}]*)(\s*,?\s*\bFeatureDevTools\b\s*,?)([^}]*\})/g,
        (_, before, _devtools, after) => {
          // Clean up any double commas or leading/trailing commas left behind
          const cleaned = (before + after)
            .replace(/,\s*,/g, ',')
            .replace(/\{\s*,/, '{')
            .replace(/,\s*\}/, '}')
          return cleaned
        },
      )

      if (transformed === code) return null
      return { code: transformed, map: null }
    },
  }
}
