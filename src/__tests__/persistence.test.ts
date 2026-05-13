import { describe, it, expect } from 'vitest'
import {
  loadPersistedOverrides,
  savePersistedOverrides,
  removePersistedOverrides,
  loadProfiles,
  saveProfiles,
  PERSIST_KEY,
  PROFILES_KEY,
} from '../core/persistence'

describe('loadPersistedOverrides', () => {
  it('returns empty object when localStorage is empty', () => {
    expect(loadPersistedOverrides()).toEqual({})
  })

  it('returns parsed overrides from localStorage', () => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ myFlag: true, other: false }))
    expect(loadPersistedOverrides()).toEqual({ myFlag: true, other: false })
  })

  it('returns empty object on malformed JSON', () => {
    localStorage.setItem(PERSIST_KEY, 'not-json{{{')
    expect(loadPersistedOverrides()).toEqual({})
  })
})

describe('savePersistedOverrides', () => {
  it('writes overrides to localStorage', () => {
    savePersistedOverrides({ flagA: true })
    expect(JSON.parse(localStorage.getItem(PERSIST_KEY)!)).toEqual({ flagA: true })
  })

  it('overwrites previous value', () => {
    savePersistedOverrides({ flagA: true })
    savePersistedOverrides({ flagB: false })
    expect(JSON.parse(localStorage.getItem(PERSIST_KEY)!)).toEqual({ flagB: false })
  })
})

describe('removePersistedOverrides', () => {
  it('removes the key from localStorage', () => {
    localStorage.setItem(PERSIST_KEY, '{"x":true}')
    removePersistedOverrides()
    expect(localStorage.getItem(PERSIST_KEY)).toBeNull()
  })
})

describe('loadProfiles / saveProfiles', () => {
  it('returns empty object when no profiles saved', () => {
    expect(loadProfiles()).toEqual({})
  })

  it('round-trips profiles correctly', () => {
    const profiles = { staging: { dark: true, beta: false } }
    saveProfiles(profiles)
    expect(loadProfiles()).toEqual(profiles)
  })

  it('loadProfiles returns empty object on malformed JSON', () => {
    localStorage.setItem(PROFILES_KEY, '!!!')
    expect(loadProfiles()).toEqual({})
  })
})
