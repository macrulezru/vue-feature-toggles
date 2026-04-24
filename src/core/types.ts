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

/**
 * A flag definition — either a plain value or an object with a rollout percentage.
 * Rollout is evaluated deterministically per userId + flagName.
 *
 * @example
 * flags: {
 *   newCheckout: { value: true, rollout: 0.2 }  // enabled for 20% of users
 * }
 */
export type FlagDefinition = FlagValue | { value: FlagValue; rollout: number }

export type FlagSource = 'url' | 'runtime' | 'rules' | 'loader' | 'static' | 'schedule' | 'default'

export interface FlagMeta {
  description?: string
  owner?: string
  addedAt?: string
  ticket?: string
}

/**
 * Schedule for a flag — constrains when the flag is active.
 * Outside the window the flag is forced to its inactive state
 * (unless overridden via URL or runtime setFlag).
 */
export interface FlagSchedule {
  /** ISO date string — flag becomes active on this date */
  from?: string
  /** ISO date string — flag becomes inactive after this date */
  to?: string
}

export interface SetFlagOptions {
  persist?: boolean
}

export interface WatchFlagOptions {
  /** Debounce callback by N ms — useful to avoid analytics spam on rapid DevTools toggling */
  debounce?: number
  /** Fire the callback immediately with the current value */
  immediate?: boolean
}

export interface LiveUpdatesOptions {
  type: 'sse' | 'websocket'
  url: string
  /** Reconnect delay in ms. Default: 3000 */
  reconnectDelay?: number
}

export interface FeatureTogglesOptions {
  /** Boolean, variant, or rollout flag definitions */
  flags?: Record<string, FlagDefinition>
  loader?: () => Promise<Record<string, FlagValue>>
  reloadInterval?: number
  urlOverrides?: boolean
  urlPrefix?: string
  defaultValue?: boolean

  /**
   * User identifier for deterministic rollout evaluation.
   * Same userId always resolves to the same on/off result for a given rollout flag.
   */
  userId?: string

  /**
   * Schedule per flag — constrains when flags are active.
   * @example
   * schedule: { christmasBanner: { from: '2025-12-01', to: '2026-01-10' } }
   */
  schedule?: Record<string, FlagSchedule>

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

  // Metadata & expiry
  getFlagMeta: (name: string) => FlagMeta | undefined
  isExpired: (name: string) => boolean
  isPersisted: (name: string) => boolean
  clearPersistedFlags: () => void
  watchFlag: (name: string, callback: (value: boolean, oldValue: boolean) => void, options?: WatchFlagOptions) => WatchStopHandle

  // Rollout
  getRollout: (name: string) => number | undefined

  // Schedule
  getSchedule: (name: string) => FlagSchedule | undefined
  isScheduleActive: (name: string) => boolean

  // Introspection (DevTools / CLI)
  listVariables: (flagName: string) => string[]
  listGroups: () => Record<string, string[]>
}
