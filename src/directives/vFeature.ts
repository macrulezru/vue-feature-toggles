import { watchEffect } from 'vue'
import type { Directive, DirectiveBinding } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider } from '../core/types'

const stoppers = new WeakMap<HTMLElement, () => void>()

function getProvider(binding: DirectiveBinding): FeatureProvider | undefined {
  return binding.instance?.$.appContext.provides[FEATURE_PROVIDER_KEY as unknown as string]
}

function setup(el: HTMLElement, binding: DirectiveBinding): void {
  const provider = getProvider(binding)
  if (!provider) return

  const stop = watchEffect(() => {
    const value: string | string[] = binding.value
    const isInverted = binding.arg === 'not'

    const isEnabled = Array.isArray(value)
      ? value.every((name) => provider.flags.value[name] ?? false)
      : (provider.flags.value[value] ?? false)

    el.style.display = (isInverted ? !isEnabled : isEnabled) ? '' : 'none'
  })

  stoppers.set(el, stop)
}

export const vFeature: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    setup(el, binding)
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    stoppers.get(el)?.()
    setup(el, binding)
  },

  unmounted(el: HTMLElement) {
    stoppers.get(el)?.()
    stoppers.delete(el)
  },
}
