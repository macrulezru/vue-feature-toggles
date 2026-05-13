import type { FlagValue } from './types'

export const PERSIST_KEY  = 'vue-feature-toggles:overrides'
export const PROFILES_KEY = 'vue-feature-toggles:profiles'

export function loadPersistedOverrides(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}')
  } catch {
    return {}
  }
}

export function savePersistedOverrides(data: Record<string, boolean>): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(PERSIST_KEY, JSON.stringify(data)) } catch {}
}

export function removePersistedOverrides(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(PERSIST_KEY) } catch {}
}

export function loadProfiles(): Record<string, Record<string, FlagValue>> {
  if (typeof localStorage === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}') } catch { return {} }
}

export function saveProfiles(data: Record<string, Record<string, FlagValue>>): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(data)) } catch {}
}
