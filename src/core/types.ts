import type { Ref } from 'vue'

export type FlagSource = 'url' | 'runtime' | 'loader' | 'static' | 'default'

export interface FeatureTogglesOptions {
  flags?: Record<string, boolean>
  loader?: () => Promise<Record<string, boolean>>
  reloadInterval?: number
  urlOverrides?: boolean
  urlPrefix?: string
  defaultValue?: boolean
}

export interface FeatureProvider {
  flags: Ref<Record<string, boolean>>
  isLoading: Ref<boolean>
  isReady: Ref<boolean>
  isEnabled: (name: string) => boolean
  setFlag: (name: string, value: boolean) => void
  resetFlag: (name: string) => void
  resetAll: () => void
  reload: () => Promise<void>
  getFlagSource: (name: string) => FlagSource
}
