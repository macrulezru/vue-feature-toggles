import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import Feature from '../components/feature.vue'

function makeWrapper(flags: Record<string, boolean | string> = {}) {
  const provider = createFeatureProvider({ flags })
  return {
    install: {
      install(app: any) {
        app.provide(FEATURE_PROVIDER_KEY, provider)
      },
    },
  }
}

describe('<Feature> without name or group', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('warns in dev mode when neither name nor group is passed', () => {
    // Regression: previously silently rendered nothing/fallback with no
    // indication anything was misconfigured.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { install } = makeWrapper({ feat: true })
    mount(
      defineComponent({
        components: { Feature },
        template: '<Feature>content</Feature>',
      }),
      { global: { plugins: [install] } },
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('neither "name" nor "group"'),
    )
  })

  it('does not warn when name is passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { install } = makeWrapper({ feat: true })
    mount(
      defineComponent({
        components: { Feature },
        template: '<Feature name="feat">content</Feature>',
      }),
      { global: { plugins: [install] } },
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not warn when group is passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { install } = makeWrapper({ feat: true })
    mount(
      defineComponent({
        components: { Feature },
        template: '<Feature group="g">content</Feature>',
      }),
      { global: { plugins: [install] } },
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
