import type { FlagSource, FlagValue, FlagMeta } from '../core/types'

export const SOURCE_STYLES: Record<FlagSource, { bg: string; color: string }> = {
  url:      { bg: '#dbeafe', color: '#1e40af' },
  runtime:  { bg: '#ffedd5', color: '#9a3412' },
  rules:    { bg: '#dcfce7', color: '#166534' },
  loader:   { bg: '#ede9fe', color: '#5b21b6' },
  static:   { bg: '#f3f4f6', color: '#374151' },
  schedule: { bg: '#fef9c3', color: '#854d0e' },
  default:  { bg: '#f9fafb', color: '#9ca3af' },
}

export const SOURCE_STYLES_DARK: Record<FlagSource, { bg: string; color: string }> = {
  url:      { bg: '#1e3a5f', color: '#93c5fd' },
  runtime:  { bg: '#431407', color: '#fdba74' },
  rules:    { bg: '#14532d', color: '#86efac' },
  loader:   { bg: '#2e1065', color: '#c4b5fd' },
  static:   { bg: '#3f3f46', color: '#d4d4d8' },
  schedule: { bg: '#451a03', color: '#fde68a' },
  default:  { bg: '#27272a', color: '#71717a' },
}

export const ALL_SOURCES: FlagSource[] = ['url', 'runtime', 'rules', 'loader', 'static', 'default']

export interface FlagEntry {
  name: string
  value: FlagValue
  isVariant: boolean
  source: FlagSource
  isOverridden: boolean
  isExpired: boolean
  isPersisted: boolean
  meta: FlagMeta | undefined
  depViolations: string[]
  varNames: string[]
  hasVars: boolean
}

export interface HistoryEntry {
  time: string
  name: string
  value: FlagValue
  source: FlagSource
}
