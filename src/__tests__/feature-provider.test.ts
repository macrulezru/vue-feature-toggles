import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { createFeatureProvider } from '../core/FeatureProvider'
import { PERSIST_KEY } from '../core/persistence'

// ---------------------------------------------------------------------------
// Flag priority chain
// ---------------------------------------------------------------------------

describe('flag priority chain', () => {
  it('returns defaultValue for unknown flags', () => {
    const p = createFeatureProvider({ defaultValue: false })
    expect(p.isEnabled('unknown')).toBe(false)
  })

  it('static flags are visible', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.isEnabled('feat')).toBe(true)
  })

  it('loader flags override static flags', async () => {
    const p = createFeatureProvider({
      flags: { feat: false },
      loader: async () => ({ feat: true }),
    })
    await nextTick()
    expect(p.isEnabled('feat')).toBe(true)
  })

  it('runtime setFlag overrides loader', async () => {
    const p = createFeatureProvider({
      flags: { feat: false },
      loader: async () => ({ feat: true }),
    })
    await nextTick()
    p.setFlag('feat', false)
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('getFlagSource reports static', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.getFlagSource('feat')).toBe('static')
  })

  it('getFlagSource reports loader', async () => {
    const p = createFeatureProvider({ loader: async () => ({ feat: true }) })
    await nextTick()
    expect(p.getFlagSource('feat')).toBe('loader')
  })

  it('getFlagSource reports runtime after setFlag', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true)
    expect(p.getFlagSource('feat')).toBe('runtime')
  })
})

// ---------------------------------------------------------------------------
// setFlag / resetFlag / resetAll
// ---------------------------------------------------------------------------

describe('setFlag / resetFlag / resetAll', () => {
  it('setFlag enables a flag', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true)
    expect(p.isEnabled('feat')).toBe(true)
  })

  it('resetFlag restores to underlying value', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true)
    p.resetFlag('feat')
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('resetAll clears all runtime overrides', () => {
    const p = createFeatureProvider({ flags: { a: false, b: false } })
    p.setFlag('a', true)
    p.setFlag('b', true)
    p.resetAll()
    expect(p.isEnabled('a')).toBe(false)
    expect(p.isEnabled('b')).toBe(false)
  })

  it('persist: true writes to localStorage', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true, { persist: true })
    expect(JSON.parse(localStorage.getItem(PERSIST_KEY)!)).toEqual({ feat: true })
    expect(p.isPersisted('feat')).toBe(true)
  })

  it('resetFlag removes from localStorage', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true, { persist: true })
    p.resetFlag('feat')
    expect(JSON.parse(localStorage.getItem(PERSIST_KEY)!)).toEqual({})
    expect(p.isPersisted('feat')).toBe(false)
  })

  it('resetAll clears localStorage', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true, { persist: true })
    p.resetAll()
    expect(localStorage.getItem(PERSIST_KEY)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

describe('variants', () => {
  it('getVariant returns empty string for boolean flags', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.getVariant('feat')).toBe('')
  })

  it('getVariant returns string value for variant flags', () => {
    const p = createFeatureProvider({ flags: { ui: 'v2' } })
    expect(p.getVariant('ui')).toBe('v2')
  })

  it('setVariant updates the variant', () => {
    const p = createFeatureProvider({ flags: { ui: 'v1' } })
    p.setVariant('ui', 'v2')
    expect(p.getVariant('ui')).toBe('v2')
  })
})

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

describe('groups', () => {
  it('setGroup enables all members', () => {
    const p = createFeatureProvider({
      flags: { a: false, b: false },
      groups: { beta: ['a', 'b'] },
    })
    p.setGroup('beta', true)
    expect(p.isEnabled('a')).toBe(true)
    expect(p.isEnabled('b')).toBe(true)
  })

  it('resetGroup removes overrides for all members', () => {
    const p = createFeatureProvider({
      flags: { a: false, b: false },
      groups: { beta: ['a', 'b'] },
    })
    p.setGroup('beta', true)
    p.resetGroup('beta')
    expect(p.isEnabled('a')).toBe(false)
    expect(p.isEnabled('b')).toBe(false)
  })

  it('isGroupEnabled returns true when all members are on', () => {
    const p = createFeatureProvider({
      flags: { a: true, b: true },
      groups: { beta: ['a', 'b'] },
    })
    expect(p.isGroupEnabled('beta')).toBe(true)
  })

  it('isGroupEnabled returns false when any member is off', () => {
    const p = createFeatureProvider({
      flags: { a: true, b: false },
      groups: { beta: ['a', 'b'] },
    })
    expect(p.isGroupEnabled('beta')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

describe('dependencies', () => {
  it('forces dependent flag to false when required flag is disabled', () => {
    const p = createFeatureProvider({
      flags: { base: false, feat: true },
      dependencies: { feat: ['base'] },
    })
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('allows dependent flag when required flag is enabled', () => {
    const p = createFeatureProvider({
      flags: { base: true, feat: true },
      dependencies: { feat: ['base'] },
    })
    expect(p.isEnabled('feat')).toBe(true)
  })

  it('getDependencyViolations lists violated deps', () => {
    const p = createFeatureProvider({
      flags: { base: false, feat: true },
      dependencies: { feat: ['base'] },
    })
    expect(p.getDependencyViolations()).toEqual({ feat: ['base'] })
  })

  it('getDependencyViolations is empty when no violations', () => {
    const p = createFeatureProvider({
      flags: { base: true, feat: true },
      dependencies: { feat: ['base'] },
    })
    expect(p.getDependencyViolations()).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

describe('schedule', () => {
  it('forces flag off before "from" date', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
    const p = createFeatureProvider({
      flags: { feat: true },
      schedule: { feat: { from: future } },
    })
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('forces flag off after "to" date', () => {
    const past = new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10)
    const p = createFeatureProvider({
      flags: { feat: true },
      schedule: { feat: { to: past } },
    })
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('allows flag when within schedule window', () => {
    const past   = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const p = createFeatureProvider({
      flags: { feat: true },
      schedule: { feat: { from: past, to: future } },
    })
    expect(p.isEnabled('feat')).toBe(true)
  })

  it('isScheduleActive returns false before "from"', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
    const p = createFeatureProvider({
      flags: { feat: true },
      schedule: { feat: { from: future } },
    })
    expect(p.isScheduleActive('feat')).toBe(false)
  })

  it('isScheduleActive returns true for flags without schedule', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.isScheduleActive('feat')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

describe('variables', () => {
  it('getVariable returns static variable value', () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      variables: { feat: { limit: 100 } },
    })
    expect(p.getVariable('feat', 'limit').value).toBe(100)
  })

  it('setVariable overrides static value reactively', async () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      variables: { feat: { limit: 100 } },
    })
    const limit = p.getVariable('feat', 'limit')
    p.setVariable('feat', 'limit', 200)
    await nextTick()
    expect(limit.value).toBe(200)
  })

  it('listVariables returns all variable names', () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      variables: { feat: { a: 1, b: 2 } },
    })
    expect(p.listVariables('feat').sort()).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

describe('expiry', () => {
  it('isExpired returns true for past expiry date', () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      expiry: { feat: '2020-01-01' },
    })
    expect(p.isExpired('feat')).toBe(true)
  })

  it('isExpired returns false for future expiry date', () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      expiry: { feat: '2099-01-01' },
    })
    expect(p.isExpired('feat')).toBe(false)
  })

  it('isExpired returns false for flags without expiry', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.isExpired('feat')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe('getFlagMeta', () => {
  it('returns meta for a known flag', () => {
    const p = createFeatureProvider({
      flags: { feat: true },
      meta: { feat: { owner: 'alice', ticket: 'PROJ-1' } },
    })
    expect(p.getFlagMeta('feat')).toEqual({ owner: 'alice', ticket: 'PROJ-1' })
  })

  it('returns undefined for flags without meta', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.getFlagMeta('feat')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

describe('profiles', () => {
  it('saveProfile / listProfiles round-trip', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    p.saveProfile('staging', { feat: false })
    expect(p.listProfiles()).toContain('staging')
  })

  it('loadProfile applies saved flags', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    p.saveProfile('off', { feat: false })
    p.loadProfile('off')
    expect(p.isEnabled('feat')).toBe(false)
  })

  it('loadProfile("default") resets all overrides', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true)
    p.loadProfile('default')
    expect(p.isEnabled('feat')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Loader state
// ---------------------------------------------------------------------------

describe('loader / isReady', () => {
  it('isReady is true immediately when no loader', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.isReady.value).toBe(true)
  })

  it('isReady becomes true after loader resolves', async () => {
    const p = createFeatureProvider({ loader: async () => ({ feat: true }) })
    expect(p.isReady.value).toBe(false)
    await nextTick()
    expect(p.isReady.value).toBe(true)
  })

  it('reload calls the loader again', async () => {
    let call = 0
    const p = createFeatureProvider({ loader: async () => { call++; return { feat: call > 1 } } })
    await nextTick()
    expect(p.isEnabled('feat')).toBe(false)
    await p.reload()
    expect(p.isEnabled('feat')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Rollout
// ---------------------------------------------------------------------------

describe('getRollout', () => {
  it('returns rollout percentage for rollout flags', () => {
    const p = createFeatureProvider({ flags: { feat: { value: true, rollout: 0.3 } } })
    expect(p.getRollout('feat')).toBe(0.3)
  })

  it('returns undefined for non-rollout flags', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    expect(p.getRollout('feat')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// SSR serialization
// ---------------------------------------------------------------------------

describe('serialize', () => {
  it('returns current flag values snapshot', () => {
    const p = createFeatureProvider({ flags: { a: true, b: false } })
    expect(p.serialize()).toEqual({ a: true, b: false })
  })

  it('includes runtime overrides in snapshot', () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    p.setFlag('feat', true)
    expect(p.serialize().feat).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// watchFlag
// ---------------------------------------------------------------------------

describe('watchFlag', () => {
  it('calls callback when flag changes', async () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    const calls: boolean[] = []
    p.watchFlag('feat', (val) => calls.push(val))
    p.setFlag('feat', true)
    await nextTick()
    expect(calls).toEqual([true])
  })

  it('fires immediately when immediate: true', () => {
    const p = createFeatureProvider({ flags: { feat: true } })
    const calls: boolean[] = []
    p.watchFlag('feat', (val) => calls.push(val), { immediate: true })
    expect(calls).toEqual([true])
  })

  it('stop handle stops watching', async () => {
    const p = createFeatureProvider({ flags: { feat: false } })
    const calls: boolean[] = []
    const stop = p.watchFlag('feat', (val) => calls.push(val))
    stop()
    p.setFlag('feat', true)
    await nextTick()
    expect(calls).toHaveLength(0)
  })
})
