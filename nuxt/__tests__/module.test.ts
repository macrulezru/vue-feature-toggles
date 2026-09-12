import { describe, expect, it, vi } from 'vitest'
import type { Nuxt } from '@nuxt/schema'

const addPlugin = vi.fn()
const addImports = vi.fn()
const addTemplate = vi.fn()

vi.mock('@nuxt/kit', async () => {
  const actual = await vi.importActual<typeof import('@nuxt/kit')>('@nuxt/kit')
  return {
    ...actual,
    defineNuxtModule: (config: unknown) => config,
    addPlugin,
    addImports,
    addTemplate,
    createResolver: () => ({ resolve: (p: string) => p }),
  }
})

const mod = (await import('../module')).default as unknown as {
  meta: { name: string; configKey: string }
  setup: (options: Record<string, unknown>, nuxt: Nuxt) => void
}
const { functionalOptionsTemplateFilename } = await import('../module')

function makeNuxt() {
  const nuxt = { options: { runtimeConfig: { public: {} as Record<string, unknown> } } }
  return nuxt as unknown as Nuxt
}

describe('vue-feature-toggles/nuxt module', () => {
  it('exposes the expected module meta', () => {
    expect(mod.meta).toMatchObject({
      name: 'vue-feature-toggles',
      configKey: 'featureToggles',
    })
  })

  it('auto-imports the composables, not just registering the plugin', () => {
    // Regression: the Nuxt module never called addImports at all — every
    // composable needed a manual import even under Nuxt.
    addImports.mockClear()
    mod.setup({}, makeNuxt())
    const imported = addImports.mock.calls[0][0] as Array<{ name: string; from: string }>
    const names = imported.map((i) => i.name)
    expect(names).toEqual(
      expect.arrayContaining(['useFeature', 'useFeatureVariant', 'useFeatureProvider']),
    )
  })

  it('registers the runtime plugin', () => {
    addPlugin.mockClear()
    mod.setup({}, makeNuxt())
    expect(addPlugin).toHaveBeenCalledTimes(1)
  })

  it('generates an empty functionalOptions template when no configFile is set', () => {
    // Regression: loader/rules (function-valued) had no way at all to reach
    // a Nuxt consumer, since runtimeConfig.public only survives JSON
    // serialization.
    addTemplate.mockClear()
    mod.setup({}, makeNuxt())
    const call = addTemplate.mock.calls.find(
      (c) => (c[0] as { filename: string }).filename === functionalOptionsTemplateFilename,
    )
    expect(call).toBeDefined()
    const getContents = (call![0] as { getContents: () => string }).getContents
    expect(getContents()).toBe('export const functionalOptions = {}')
  })

  it('generates a functionalOptions template importing configFile when set', () => {
    addTemplate.mockClear()
    mod.setup({ configFile: '~/feature-toggles.config' }, makeNuxt())
    const call = addTemplate.mock.calls.find(
      (c) => (c[0] as { filename: string }).filename === functionalOptionsTemplateFilename,
    )
    expect(call).toBeDefined()
    const getContents = (call![0] as { getContents: () => string }).getContents
    expect(getContents()).toBe(
      `export { default as functionalOptions } from "~/feature-toggles.config"`,
    )
  })

  it('passes flags/loader-adjacent runtime options through to runtimeConfig.public', () => {
    const nuxt = makeNuxt()
    mod.setup({ flags: { a: true }, groups: { g: ['a'] }, userId: 'u1' }, nuxt)
    expect(nuxt.options.runtimeConfig.public.featureToggles).toMatchObject({
      flags: { a: true },
      groups: { g: ['a'] },
      userId: 'u1',
    })
  })
})
