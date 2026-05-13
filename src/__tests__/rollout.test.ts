import { describe, it, expect } from 'vitest'
import { hashToFloat, resolveFlagDef } from '../core/rollout'

describe('hashToFloat', () => {
  it('returns a number in [0, 1]', () => {
    const val = hashToFloat('user123:myFlag')
    expect(val).toBeGreaterThanOrEqual(0)
    expect(val).toBeLessThanOrEqual(1)
  })

  it('is deterministic for the same input', () => {
    expect(hashToFloat('abc')).toBe(hashToFloat('abc'))
  })

  it('produces different values for different inputs', () => {
    expect(hashToFloat('user1:flag')).not.toBe(hashToFloat('user2:flag'))
  })
})

describe('resolveFlagDef', () => {
  it('returns plain boolean value as-is', () => {
    expect(resolveFlagDef('flag', true)).toBe(true)
    expect(resolveFlagDef('flag', false)).toBe(false)
  })

  it('returns plain string value as-is', () => {
    expect(resolveFlagDef('flag', 'variantA')).toBe('variantA')
  })

  it('returns value when hash is below rollout threshold', () => {
    // rollout: 1.0 means always enabled
    expect(resolveFlagDef('flag', { value: true, rollout: 1.0 }, 'user')).toBe(true)
  })

  it('returns false when hash is above rollout threshold', () => {
    // rollout: 0.0 means never enabled
    expect(resolveFlagDef('flag', { value: true, rollout: 0.0 }, 'user')).toBe(false)
  })

  it('is deterministic per userId + flagName pair', () => {
    const def = { value: true, rollout: 0.5 }
    const result1 = resolveFlagDef('myFlag', def, 'alice')
    const result2 = resolveFlagDef('myFlag', def, 'alice')
    expect(result1).toBe(result2)
  })

  it('uses "anonymous" key when no userId provided', () => {
    const def = { value: true, rollout: 1.0 }
    expect(resolveFlagDef('flag', def)).toBe(true)
    expect(resolveFlagDef('flag', def, undefined)).toBe(true)
  })

  it('same flag differs per user', () => {
    const def = { value: true, rollout: 0.5 }
    const results = new Set(
      ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10']
        .map(u => resolveFlagDef('flag', def, u)),
    )
    // At 50% rollout across 10 users we should see both true and false
    expect(results.size).toBeGreaterThan(1)
  })
})
