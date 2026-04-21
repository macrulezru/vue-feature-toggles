import type { Ref, WatchStopHandle } from 'vue'

/**
 * Extend this interface via module augmentation to get typed flag names:
 *
 * declare module 'vue-feature-toggles' {
 *   interface FeatureFlagNames {
 *     newDashboard: true
 *     betaSearch: true
 *   }
 * }
 */
export interface FeatureFlagNames {}

export type FlagName = keyof FeatureFlagNames extends never ? string : keyof FeatureFlagNames

/** A flag value is either a boolean toggle or a variant string (for A/B flags) */
export type FlagValue = boolean | string

export type FlagSource = 'url' | 'runtime' | 'rules' | 'loader' | 'static' | 'default'

export interface FlagMeta {
  description?: string
  owner?: string
  addedAt?: string
  ticket?: string
}

export interface SetFlagOptions {
  persist?: boolean
}

export interface LiveUpdatesOptions {
  type: 'sse' | 'websocket'
  url: string
  /** Reconnect delay in ms. Default: 3000 */
  reconnectDelay?: number
}

export interface FeatureTogglesOptions {
  /** Boolean and variant (string) flag values */
  flags?: Record<string, FlagValue>
  loader?: () => Promise<Record<string, FlagValue>>
  reloadInterval?: number
  urlOverrides?: boolean
  urlPrefix?: string
  defaultValue?: boolean

  /**
   * Server-side flag snapshot passed to the client to prevent hydration mismatch.
   * Populated via serializeFlags() on the server, then passed here on the client.
   */
  ssrState?: Record<string, FlagValue>

  /** Live flag updates pushed from the server via SSE or WebSocket. */
  liveUpdates?: LiveUpdatesOptions

  /** Variables scoped to a flag: { flagName: { varName: value } } */
  variables?: Record<string, Record<string, unknown>>

  /** Named groups of flags: { groupName: [flagName, ...] } */
  groups?: Record<string, string[]>

  /**
   * Flag dependencies: { flagName: [requiredFlagName, ...] }
   * If any required flag is disabled, the dependent flag is forced to false.
   */
  dependencies?: Record<string, string[]>

  /**
   * Contextual rules evaluated reactively.
   * Priority: below URL overrides and setFlag, above loader/static.
   */
  rules?: Record<string, () => boolean>

  meta?: Record<string, FlagMeta>
  expiry?: Record<string, string>
}

export interface FeatureProvider {
  flags: Ref<Record<string, FlagValue>>
  isLoading: Ref<boolean>
  isReady: Ref<boolean>

  // Boolean flags
  isEnabled: (name: string) => boolean
  setFlag: (name: string, value: boolean, options?: SetFlagOptions) => void
  resetFlag: (name: string) => void
  resetAll: () => void
  reload: () => Promise<void>
  getFlagSource: (name: string) => FlagSource

  // Variant flags
  getVariant: (name: string) => string
  setVariant: (name: string, variant: string) => void

  // Variables
  getVariable: <T = unknown>(flagName: string, varName: string) => Ref<T>
  setVariable: (flagName: string, varName: string, value: unknown) => void

  // Groups
  setGroup: (groupName: string, value: boolean) => void
  resetGroup: (groupName: string) => void
  isGroupEnabled: (groupName: string) => boolean

  // Dependencies
  getDependencyViolations: () => Record<string, string[]>

  // Profiles
  saveProfile: (name: string, flags: Record<string, FlagValue>) => void
  loadProfile: (name: string) => void
  listProfiles: () => string[]

  // SSR
  serialize: () => Record<string, FlagValue>

  // Phase 1
  getFlagMeta: (name: string) => FlagMeta | undefined
  isExpired: (name: string) => boolean
  isPersisted: (name: string) => boolean
  clearPersistedFlags: () => void
  watchFlag: (name: string, callback: (value: boolean, oldValue: boolean) => void) => WatchStopHandle

  // Introspection (DevTools / CLI)
  listVariables: (flagName: string) => string[]
  listGroups: () => Record<string, string[]>
}
