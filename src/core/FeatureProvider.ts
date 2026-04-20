import { ref, computed } from 'vue'
import type { FeatureTogglesOptions, FeatureProvider, FlagSource } from './types'

export const FEATURE_PROVIDER_KEY = Symbol('FeatureProvider')

export function createFeatureProvider(options: FeatureTogglesOptions): FeatureProvider {
  const {
    flags: staticFlags = {},
    loader,
    reloadInterval = 0,
    urlOverrides = import.meta.env?.DEV === true,
    urlPrefix = 'feature',
    defaultValue = false,
  } = options

  const loaderFlags = ref<Record<string, boolean>>({})
  const runtimeOverrides = ref<Record<string, boolean>>({})
  const urlQueryParams = ref(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams(),
  )
  const isLoading = ref(false)
  const isReady = ref(false)

  if (urlOverrides && typeof window !== 'undefined') {
    const syncParams = () => {
      urlQueryParams.value = new URLSearchParams(window.location.search)
    }
    window.addEventListener('popstate', syncParams)
    window.addEventListener('hashchange', syncParams)
  }

  const urlOverrideMap = computed<Record<string, boolean>>(() => {
    if (!urlOverrides) return {}
    const result: Record<string, boolean> = {}
    urlQueryParams.value.forEach((value, key) => {
      if (key.startsWith(`${urlPrefix}:`)) {
        const flagName = key.slice(urlPrefix.length + 1)
        result[flagName] = value !== 'false' && value !== '0'
      }
    })
    return result
  })

  const flags = computed<Record<string, boolean>>(() => {
    const merged: Record<string, boolean> = {}
    const allKeys = new Set([
      ...Object.keys(staticFlags),
      ...Object.keys(loaderFlags.value),
      ...Object.keys(runtimeOverrides.value),
      ...Object.keys(urlOverrideMap.value),
    ])
    for (const key of allKeys) {
      if (key in urlOverrideMap.value) {
        merged[key] = urlOverrideMap.value[key]
      } else if (key in runtimeOverrides.value) {
        merged[key] = runtimeOverrides.value[key]
      } else if (key in loaderFlags.value) {
        merged[key] = loaderFlags.value[key]
      } else if (key in staticFlags) {
        merged[key] = staticFlags[key]
      } else {
        merged[key] = defaultValue
      }
    }
    return merged
  })

  const isEnabled = (name: string): boolean => {
    return flags.value[name] ?? defaultValue
  }

  const setFlag = (name: string, value: boolean): void => {
    runtimeOverrides.value = { ...runtimeOverrides.value, [name]: value }
  }

  const resetFlag = (name: string): void => {
    const { [name]: _, ...rest } = runtimeOverrides.value
    runtimeOverrides.value = rest
  }

  const resetAll = (): void => {
    runtimeOverrides.value = {}
  }

  const reload = async (): Promise<void> => {
    if (!loader) return
    isLoading.value = true
    try {
      const result = await loader()
      loaderFlags.value = result
      isReady.value = true
    } finally {
      isLoading.value = false
    }
  }

  if (loader) {
    reload()
  } else {
    isReady.value = true
  }

  if (reloadInterval > 0 && loader) {
    setInterval(reload, reloadInterval)
  }

  const getFlagSource = (name: string): FlagSource => {
    if (name in urlOverrideMap.value) return 'url'
    if (name in runtimeOverrides.value) return 'runtime'
    if (name in loaderFlags.value) return 'loader'
    if (name in staticFlags) return 'static'
    return 'default'
  }

  return { flags, isLoading, isReady, isEnabled, setFlag, resetFlag, resetAll, reload, getFlagSource }
}
