import { ref, computed, watch } from 'vue'
import type { Ref, WatchStopHandle } from 'vue'
import type {
  FeatureTogglesOptions,
  FeatureProvider,
  FlagSource,
  FlagValue,
  FlagDefinition,
  FlagSchedule,
  FlagMeta,
  SetFlagOptions,
  WatchFlagOptions,
  LiveUpdatesOptions,
} from './types'

export const FEATURE_PROVIDER_KEY = Symbol('FeatureProvider')

const PERSIST_KEY   = 'vue-feature-toggles:overrides'
const PROFILES_KEY  = 'vue-feature-toggles:profiles'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFlagTruthy(val: FlagValue | undefined): boolean {
  if (val === undefined) return false
  if (typeof val === 'boolean') return val
  return val !== '' && val !== 'false' && val !== '0'
}

function parseUrlValue(raw: string): FlagValue {
  if (raw === 'false' || raw === '0') return false
  if (raw === 'true' || raw === '1') return true
  return raw
}

function parseVarValue(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  const n = Number(raw)
  if (!isNaN(n) && raw.trim() !== '') return n
  return raw
}

function loadPersistedOverrides(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}')
  } catch {
    return {}
  }
}

function savePersistedOverrides(data: Record<string, boolean>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(data))
  } catch {}
}

function loadProfiles(): Record<string, Record<string, FlagValue>> {
  if (typeof localStorage === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}') } catch { return {} }
}

function saveProfiles(data: Record<string, Record<string, FlagValue>>): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(data)) } catch {}
}

function setupLiveUpdates(
  opts: LiveUpdatesOptions,
  applyUpdate: (partial: Record<string, FlagValue>) => void,
): void {
  if (typeof window === 'undefined') return

  const delay = opts.reconnectDelay ?? 3000

  if (opts.type === 'sse') {
    let es: EventSource
    const connect = () => {
      es = new EventSource(opts.url)
      es.onmessage = (e) => {
        try { applyUpdate(JSON.parse(e.data)) } catch {}
      }
      es.onerror = () => { es.close(); setTimeout(connect, delay) }
    }
    connect()
    return
  }

  if (opts.type === 'websocket') {
    let ws: WebSocket
    const connect = () => {
      ws = new WebSocket(opts.url)
      ws.onmessage = (e) => {
        try { applyUpdate(JSON.parse(e.data)) } catch {}
      }
      ws.onclose = () => { setTimeout(connect, delay) }
    }
    connect()
  }
}

function checkExpiry(expiry: Record<string, string>): void {
  if (import.meta.env?.DEV !== true) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const [name, dateStr] of Object.entries(expiry)) {
    const d = new Date(dateStr)
    if (isNaN(d.getTime()) || d >= today) continue
    const days = Math.floor((today.getTime() - d.getTime()) / 86400000)
    console.warn(
      `[vue-feature-toggles] Flag "${name}" expired ${days} day${days !== 1 ? 's' : ''} ago (${dateStr}). Consider removing it.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Rollout — deterministic FNV-1a hash → [0, 1]
// ---------------------------------------------------------------------------

function hashToFloat(str: string): number {
  let h = 2166136261 // FNV-1a offset basis (uint32)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0 // FNV prime, keep uint32
  }
  return h / 4294967295
}

function resolveFlagDef(name: string, def: FlagDefinition, userId?: string): FlagValue {
  if (typeof def === 'object' && def !== null && 'rollout' in def) {
    const key = `${userId ?? 'anonymous'}:${name}`
    return hashToFloat(key) < def.rollout ? def.value : false
  }
  return def as FlagValue
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFeatureProvider(options: FeatureTogglesOptions): FeatureProvider {
  const {
    flags: rawFlags = {},
    loader,
    reloadInterval = 0,
    urlOverrides = import.meta.env?.DEV === true,
    urlPrefix = 'feature',
    defaultValue = false,
    variables: staticVariables = {},
    groups = {},
    dependencies = {},
    rules = {},
    meta = {},
    expiry = {},
    schedule = {},
    ssrState,
    liveUpdates,
    userId,
  } = options

  checkExpiry(expiry)

  // ── Resolve flag definitions (rollout evaluated once at init) ──────────────
  const staticFlags: Record<string, FlagValue> = {}
  const rolloutMap: Record<string, number> = {}

  for (const [name, def] of Object.entries(rawFlags)) {
    staticFlags[name] = resolveFlagDef(name, def, userId)
    if (typeof def === 'object' && def !== null && 'rollout' in def) {
      rolloutMap[name] = def.rollout
    }
  }

  // ── Reactive state ─────────────────────────────────────────────────────────
  const loaderFlags     = ref<Record<string, FlagValue>>(ssrState ?? {})
  const persistedRaw    = loadPersistedOverrides()
  const runtimeOverrides = ref<Record<string, FlagValue>>(persistedRaw)
  const persistedKeys   = ref<Set<string>>(new Set(Object.keys(persistedRaw)))
  const runtimeVariableOverrides = ref<Record<string, Record<string, unknown>>>({})
  const urlQueryParams  = ref(
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams(),
  )
  const isLoading = ref(false)
  const isReady   = ref(false)

  if (urlOverrides && typeof window !== 'undefined') {
    const sync = () => { urlQueryParams.value = new URLSearchParams(window.location.search) }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
  }

  // ── URL overrides ──────────────────────────────────────────────────────────
  const urlOverrideMap = computed<Record<string, FlagValue>>(() => {
    if (!urlOverrides) return {}
    const result: Record<string, FlagValue> = {}
    urlQueryParams.value.forEach((value, key) => {
      if (key.startsWith(`${urlPrefix}:`)) {
        result[key.slice(urlPrefix.length + 1)] = parseUrlValue(value)
      }
    })
    return result
  })

  const urlVariableOverrides = computed<Record<string, Record<string, unknown>>>(() => {
    if (!urlOverrides) return {}
    const varPrefix = `${urlPrefix}-var:`
    const result: Record<string, Record<string, unknown>> = {}
    urlQueryParams.value.forEach((value, key) => {
      if (!key.startsWith(varPrefix)) return
      const rest = key.slice(varPrefix.length)
      const sep = rest.indexOf(':')
      if (sep === -1) return
      const flagName = rest.slice(0, sep)
      const varName  = rest.slice(sep + 1)
      if (!result[flagName]) result[flagName] = {}
      result[flagName][varName] = parseVarValue(value)
    })
    return result
  })

  // ── Rules ──────────────────────────────────────────────────────────────────
  const ruleFlags = computed<Record<string, boolean>>(() => {
    const result: Record<string, boolean> = {}
    for (const [name, rule] of Object.entries(rules)) {
      try { result[name] = rule() } catch { result[name] = false }
    }
    return result
  })

  // ── Schedule ───────────────────────────────────────────────────────────────
  // currentTime ticks every minute so schedules auto-apply without page reload
  const currentTime = ref(new Date())
  if (typeof window !== 'undefined' && Object.keys(schedule).length > 0) {
    setInterval(() => { currentTime.value = new Date() }, 60_000)
  }

  const scheduleActiveMap = computed<Record<string, boolean>>(() => {
    const now = currentTime.value
    const result: Record<string, boolean> = {}
    for (const [name, sch] of Object.entries(schedule)) {
      let active = true
      if (sch.from) {
        const from = new Date(sch.from)
        if (!isNaN(from.getTime()) && now < from) { result[name] = false; continue }
      }
      if (sch.to) {
        const to = new Date(sch.to)
        if (!isNaN(to.getTime()) && now > to) active = false
      }
      result[name] = active
    }
    return result
  })

  // ── Merged flags (priority chain + schedule + dependency resolution) ───────
  const warnedUnknown = new Set<string>()
  const warnedDeps    = new Set<string>()

  const flags = computed<Record<string, FlagValue>>(() => {
    const merged: Record<string, FlagValue> = {}
    const allKeys = new Set([
      ...Object.keys(staticFlags),
      ...Object.keys(loaderFlags.value),
      ...Object.keys(ruleFlags.value),
      ...Object.keys(runtimeOverrides.value),
      ...Object.keys(urlOverrideMap.value),
    ])

    for (const key of allKeys) {
      if (key in urlOverrideMap.value)       merged[key] = urlOverrideMap.value[key]
      else if (key in runtimeOverrides.value) merged[key] = runtimeOverrides.value[key]
      else if (key in ruleFlags.value)        merged[key] = ruleFlags.value[key]
      else if (key in loaderFlags.value)      merged[key] = loaderFlags.value[key]
      else if (key in staticFlags)            merged[key] = staticFlags[key]
      else                                    merged[key] = defaultValue
    }

    // Apply schedule — forced off unless URL or runtime override is present
    for (const [flagName, isActive] of Object.entries(scheduleActiveMap.value)) {
      if (!isActive && !(flagName in urlOverrideMap.value) && !(flagName in runtimeOverrides.value)) {
        merged[flagName] = false
      }
    }

    // Warn about dependency violations, then force-apply them
    for (const [flag, deps] of Object.entries(dependencies)) {
      const violated = deps.filter(dep => !isFlagTruthy(merged[dep]))
      if (violated.length > 0) {
        if (import.meta.env?.DEV === true && isFlagTruthy(merged[flag]) && !warnedDeps.has(flag)) {
          warnedDeps.add(flag)
          console.warn(
            `[vue-feature-toggles] Flag "${flag}" requires: ${violated.join(', ')} (currently disabled).`,
          )
        }
        merged[flag] = false
      }
    }

    return merged
  })

  // ── isEnabled ──────────────────────────────────────────────────────────────
  const isEnabled = (name: string): boolean => {
    if (
      import.meta.env?.DEV === true &&
      isReady.value &&
      !(name in flags.value) &&
      !warnedUnknown.has(name)
    ) {
      warnedUnknown.add(name)
      console.warn(`[vue-feature-toggles] Unknown flag: "${name}"`)
    }
    return isFlagTruthy(flags.value[name])
  }

  // ── Variant flags ──────────────────────────────────────────────────────────
  const getVariant = (name: string): string => {
    const val = flags.value[name]
    return typeof val === 'string' ? val : ''
  }

  const setVariant = (name: string, variant: string): void => {
    runtimeOverrides.value = { ...runtimeOverrides.value, [name]: variant }
  }

  // ── setFlag / resetFlag / resetAll ─────────────────────────────────────────
  const setFlag = (name: string, value: boolean, opts: SetFlagOptions = {}): void => {
    runtimeOverrides.value = { ...runtimeOverrides.value, [name]: value }
    if (opts.persist) {
      const next = new Set([...persistedKeys.value, name])
      persistedKeys.value = next
      const toSave: Record<string, boolean> = {}
      for (const k of next) {
        const v = k === name ? value : runtimeOverrides.value[k]
        if (typeof v === 'boolean') toSave[k] = v
      }
      savePersistedOverrides(toSave)
    } else if (persistedKeys.value.has(name)) {
      const next = new Set([...persistedKeys.value].filter(k => k !== name))
      persistedKeys.value = next
      const toSave: Record<string, boolean> = {}
      for (const k of next) {
        const v = runtimeOverrides.value[k]
        if (typeof v === 'boolean') toSave[k] = v
      }
      savePersistedOverrides(toSave)
    }
  }

  const resetFlag = (name: string): void => {
    const { [name]: _, ...rest } = runtimeOverrides.value
    runtimeOverrides.value = rest
    if (persistedKeys.value.has(name)) {
      const next = new Set([...persistedKeys.value].filter(k => k !== name))
      persistedKeys.value = next
      const toSave: Record<string, boolean> = {}
      for (const k of next) {
        const v = runtimeOverrides.value[k]
        if (typeof v === 'boolean') toSave[k] = v
      }
      savePersistedOverrides(toSave)
    }
  }

  const resetAll = (): void => {
    runtimeOverrides.value = {}
    persistedKeys.value = new Set()
    if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSIST_KEY)
  }

  // ── Variables ──────────────────────────────────────────────────────────────
  const getVariable = <T = unknown>(flagName: string, varName: string): Ref<T> => {
    return computed<T>(() => {
      const urlVars = urlVariableOverrides.value[flagName]
      if (urlVars && varName in urlVars) return urlVars[varName] as T

      const runtimeVars = runtimeVariableOverrides.value[flagName]
      if (runtimeVars && varName in runtimeVars) return runtimeVars[varName] as T

      return (staticVariables[flagName]?.[varName] ?? undefined) as T
    })
  }

  const setVariable = (flagName: string, varName: string, value: unknown): void => {
    runtimeVariableOverrides.value = {
      ...runtimeVariableOverrides.value,
      [flagName]: { ...(runtimeVariableOverrides.value[flagName] ?? {}), [varName]: value },
    }
  }

  // ── Groups ─────────────────────────────────────────────────────────────────
  const setGroup = (groupName: string, value: boolean): void => {
    for (const name of (groups[groupName] ?? [])) setFlag(name, value)
  }

  const resetGroup = (groupName: string): void => {
    for (const name of (groups[groupName] ?? [])) resetFlag(name)
  }

  const isGroupEnabled = (groupName: string): boolean => {
    const members = groups[groupName] ?? []
    return members.length > 0 && members.every(name => isFlagTruthy(flags.value[name]))
  }

  // ── Dependencies ───────────────────────────────────────────────────────────
  const getDependencyViolations = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {}
    for (const [flag, deps] of Object.entries(dependencies)) {
      const violated = deps.filter(dep => !isFlagTruthy(flags.value[dep]))
      if (violated.length > 0) result[flag] = violated
    }
    return result
  }

  // ── Loader / reload ────────────────────────────────────────────────────────
  const reload = async (): Promise<void> => {
    if (!loader) return
    isLoading.value = true
    try {
      loaderFlags.value = await loader()
      isReady.value = true
    } finally {
      isLoading.value = false
    }
  }

  if (ssrState) {
    isReady.value = true
    if (loader) reload()
  } else {
    loader ? reload() : (isReady.value = true)
  }
  if (reloadInterval > 0 && loader) setInterval(reload, reloadInterval)

  if (liveUpdates) {
    setupLiveUpdates(liveUpdates, (partial) => {
      loaderFlags.value = { ...loaderFlags.value, ...partial }
    })
  }

  // ── Source resolution ──────────────────────────────────────────────────────
  const getFlagSource = (name: string): FlagSource => {
    if (name in urlOverrideMap.value)    return 'url'
    if (name in runtimeOverrides.value)  return 'runtime'
    if (name in ruleFlags.value)         return 'rules'
    if (name in schedule && !scheduleActiveMap.value[name]) return 'schedule'
    if (name in loaderFlags.value)       return 'loader'
    if (name in staticFlags)             return 'static'
    return 'default'
  }

  // ── Metadata & expiry ──────────────────────────────────────────────────────
  const getFlagMeta = (name: string): FlagMeta | undefined => meta[name]

  const isExpired = (name: string): boolean => {
    const dateStr = expiry[name]
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  const isPersisted = (name: string): boolean => persistedKeys.value.has(name)

  const clearPersistedFlags = (): void => {
    const next = { ...runtimeOverrides.value }
    for (const k of persistedKeys.value) delete next[k]
    runtimeOverrides.value = next
    persistedKeys.value = new Set()
    if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSIST_KEY)
  }

  // ── watchFlag with optional debounce ──────────────────────────────────────
  const watchFlag = (
    name: string,
    callback: (value: boolean, oldValue: boolean) => void,
    opts: WatchFlagOptions = {},
  ): WatchStopHandle => {
    // Use computed so watch infers the correct boolean type from a Ref<boolean>
    const source = computed(() => isFlagTruthy(flags.value[name]))

    if (!opts.debounce) {
      return watch(source, (val, old) => callback(val, old ?? val), { immediate: opts.immediate })
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let pendingOld: boolean | undefined
    return watch(
      source,
      (newVal, oldVal) => {
        if (timer === null) pendingOld = oldVal ?? newVal
        else clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          callback(newVal, pendingOld!)
          pendingOld = undefined
        }, opts.debounce)
      },
      { immediate: opts.immediate },
    )
  }

  // ── Profiles ───────────────────────────────────────────────────────────────
  const saveProfile = (name: string, profileFlags: Record<string, FlagValue>): void => {
    const profiles = loadProfiles()
    profiles[name] = profileFlags
    saveProfiles(profiles)
  }

  const loadProfile = (name: string): void => {
    if (name === 'default') { resetAll(); return }
    const profile = loadProfiles()[name]
    if (!profile) return
    for (const [flag, value] of Object.entries(profile)) {
      if (typeof value === 'boolean') setFlag(flag, value)
      else if (typeof value === 'string') setVariant(flag, value)
    }
  }

  const listProfiles = (): string[] => Object.keys(loadProfiles())

  // ── Rollout introspection ──────────────────────────────────────────────────
  const getRollout = (name: string): number | undefined => rolloutMap[name]

  // ── Schedule introspection ─────────────────────────────────────────────────
  const getSchedule = (name: string): FlagSchedule | undefined => schedule[name]

  const isScheduleActive = (name: string): boolean =>
    name in schedule ? (scheduleActiveMap.value[name] ?? true) : true

  // ── Introspection ──────────────────────────────────────────────────────────
  const listVariables = (flagName: string): string[] => {
    const names = new Set([
      ...Object.keys(staticVariables[flagName] ?? {}),
      ...Object.keys(runtimeVariableOverrides.value[flagName] ?? {}),
      ...Object.keys(urlVariableOverrides.value[flagName] ?? {}),
    ])
    return [...names]
  }

  const listGroups = (): Record<string, string[]> => ({ ...groups })

  // ── SSR serialization ──────────────────────────────────────────────────────
  const serialize = (): Record<string, FlagValue> => ({ ...flags.value })

  return {
    flags,
    isLoading,
    isReady,
    isEnabled,
    setFlag,
    setVariant,
    resetFlag,
    resetAll,
    reload,
    getFlagSource,
    getVariant,
    getVariable,
    setVariable,
    setGroup,
    resetGroup,
    isGroupEnabled,
    getDependencyViolations,
    saveProfile,
    loadProfile,
    listProfiles,
    serialize,
    getFlagMeta,
    isExpired,
    isPersisted,
    clearPersistedFlags,
    watchFlag,
    getRollout,
    getSchedule,
    isScheduleActive,
    listVariables,
    listGroups,
  }
}
