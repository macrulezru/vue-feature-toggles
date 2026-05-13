import { describe, it, expect } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createFeatureProvider, FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import { useFeature, useFeatureVariant } from '../composables/useFeature'

function makeWrapper(flags: Record<string, boolean | string> = {}) {
  const provider = createFeatureProvider({ flags })
  return {
    provider,
    install: {
      install(app: any) {
        app.provide(FEATURE_PROVIDER_KEY, provider)
      },
    },
  }
}

describe('useFeature (single flag)', () => {
  it('returns a computed ref reflecting flag state', () => {
    const { install } = makeWrapper({ feat: true })
    const wrapper = mount(
      defineComponent({
        setup() { return { flag: useFeature('feat') } },
        template: '<div>{{ flag }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('true')
  })

  it('returns false when flag is off', () => {
    const { install } = makeWrapper({ feat: false })
    const wrapper = mount(
      defineComponent({
        setup() { return { flag: useFeature('feat') } },
        template: '<div>{{ flag }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('false')
  })

  it('returns false when provider is not installed', () => {
    const wrapper = mount(
      defineComponent({
        setup() { return { flag: useFeature('feat') } },
        template: '<div>{{ flag }}</div>',
      }),
    )
    expect(wrapper.text()).toBe('false')
  })

  it('is reactive — updates when flag changes', async () => {
    const { install, provider } = makeWrapper({ feat: false })
    const wrapper = mount(
      defineComponent({
        setup() { return { flag: useFeature('feat') } },
        template: '<div>{{ flag }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('false')
    provider.setFlag('feat', true)
    await nextTick()
    expect(wrapper.text()).toBe('true')
  })
})

describe('useFeature (array of flags)', () => {
  it('returns a record of computed refs', () => {
    const { install } = makeWrapper({ a: true, b: false })
    const wrapper = mount(
      defineComponent({
        setup() { return { flags: useFeature(['a', 'b']) } },
        template: '<div>{{ flags.a }},{{ flags.b }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('true,false')
  })
})

describe('useFeature (multiple args — AND)', () => {
  it('returns true only when all flags are enabled', () => {
    const { install } = makeWrapper({ a: true, b: true })
    const wrapper = mount(
      defineComponent({
        setup() { return { ok: useFeature('a', 'b') } },
        template: '<div>{{ ok }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('true')
  })

  it('returns false when any flag is disabled', () => {
    const { install } = makeWrapper({ a: true, b: false })
    const wrapper = mount(
      defineComponent({
        setup() { return { ok: useFeature('a', 'b') } },
        template: '<div>{{ ok }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('false')
  })
})

describe('useFeatureVariant', () => {
  it('returns the current variant string', () => {
    const { install } = makeWrapper({ ui: 'v2' })
    const wrapper = mount(
      defineComponent({
        setup() { return { variant: useFeatureVariant('ui') } },
        template: '<div>{{ variant }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('v2')
  })

  it('returns empty string for boolean flags', () => {
    const { install } = makeWrapper({ feat: true })
    const wrapper = mount(
      defineComponent({
        setup() { return { variant: useFeatureVariant('feat') } },
        template: '<div>{{ variant }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    expect(wrapper.text()).toBe('')
  })

  it('is reactive — updates when variant changes', async () => {
    const { install, provider } = makeWrapper({ ui: 'v1' })
    const wrapper = mount(
      defineComponent({
        setup() { return { variant: useFeatureVariant('ui') } },
        template: '<div>{{ variant }}</div>',
      }),
      { global: { plugins: [install] } },
    )
    provider.setVariant('ui', 'v2')
    await nextTick()
    expect(wrapper.text()).toBe('v2')
  })
})
