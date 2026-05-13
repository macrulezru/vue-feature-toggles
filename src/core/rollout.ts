import type { FlagDefinition, FlagValue } from './types'

/** FNV-1a 32-bit hash → float in [0, 1]. Deterministic for same input. */
export function hashToFloat(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h / 4294967295
}

export function resolveFlagDef(name: string, def: FlagDefinition, userId?: string): FlagValue {
  if (typeof def === 'object' && def !== null && 'rollout' in def) {
    const key = `${userId ?? 'anonymous'}:${name}`
    return hashToFloat(key) < def.rollout ? def.value : false
  }
  return def as FlagValue
}
