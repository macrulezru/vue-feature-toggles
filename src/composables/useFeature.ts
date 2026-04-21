import { computed, inject } from 'vue'
import type { Ref } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider, FlagName } from '../core/types'

export function useFeature(name: FlagName): Ref<boolean>
export function useFeature<T extends FlagName>(names: T[]): Record<T, Ref<boolean>>
export function useFeature(first: FlagName, ...rest: FlagName[]): Ref<boolean>
export function useFeature(
  firstOrArray: FlagName | FlagName[],
  ...rest: FlagName[]
): Ref<boolean> | Record<string, Ref<boolean>> {
  const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

  if (Array.isArray(firstOrArray)) {
    const result: Record<string, Ref<boolean>> = {}
    for (const name of firstOrArray) {
      result[name] = computed(() => provider?.isEnabled(name) ?? false)
    }
    return result
  }

  if (rest.length > 0) {
    const allNames = [firstOrArray, ...rest]
    return computed(() => allNames.every((name) => provider?.isEnabled(name) ?? false))
  }

  return computed(() => provider?.isEnabled(firstOrArray) ?? false)
}

/** Returns the current variant string for a multivariate flag. */
export function useFeatureVariant(name: FlagName): Ref<string> {
  const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)
  return computed(() => provider?.getVariant(name) ?? '')
}
