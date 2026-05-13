import type { FlagValue } from './types'

export function isFlagTruthy(val: FlagValue | undefined): boolean {
  if (val === undefined) return false
  if (typeof val === 'boolean') return val
  return val !== '' && val !== 'false' && val !== '0'
}

export function parseUrlValue(raw: string): FlagValue {
  if (raw === 'false' || raw === '0') return false
  if (raw === 'true'  || raw === '1') return true
  return raw
}

export function parseVarValue(raw: string): unknown {
  if (raw === 'true')  return true
  if (raw === 'false') return false
  const n = Number(raw)
  if (!isNaN(n) && raw.trim() !== '') return n
  return raw
}
