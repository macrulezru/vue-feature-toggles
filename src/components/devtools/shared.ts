import type { FlagSource, FlagValue, FlagMeta } from '../../core/types'

export const SOURCE_STYLES: Record<FlagSource, { bg: string; color: string }> = {
  url:      { bg: '#dbeafe', color: '#1e40af' },
  runtime:  { bg: '#ffedd5', color: '#9a3412' },
  rules:    { bg: '#dcfce7', color: '#166534' },
  loader:   { bg: '#ede9fe', color: '#5b21b6' },
  static:   { bg: '#f3f4f6', color: '#374151' },
  schedule: { bg: '#fef9c3', color: '#854d0e' },
  default:  { bg: '#f9fafb', color: '#9ca3af' },
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
