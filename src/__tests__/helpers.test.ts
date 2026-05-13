import { describe, it, expect } from 'vitest'
import { isFlagTruthy, parseUrlValue, parseVarValue } from '../core/helpers'

describe('isFlagTruthy', () => {
  it('returns false for undefined', () => {
    expect(isFlagTruthy(undefined)).toBe(false)
  })

  it('returns true for boolean true', () => {
    expect(isFlagTruthy(true)).toBe(true)
  })

  it('returns false for boolean false', () => {
    expect(isFlagTruthy(false)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isFlagTruthy('')).toBe(false)
  })

  it('returns false for string "false"', () => {
    expect(isFlagTruthy('false')).toBe(false)
  })

  it('returns false for string "0"', () => {
    expect(isFlagTruthy('0')).toBe(false)
  })

  it('returns true for non-empty non-false string', () => {
    expect(isFlagTruthy('variantA')).toBe(true)
    expect(isFlagTruthy('1')).toBe(true)
    expect(isFlagTruthy('true')).toBe(true)
  })
})

describe('parseUrlValue', () => {
  it('parses "false" to boolean false', () => {
    expect(parseUrlValue('false')).toBe(false)
  })

  it('parses "0" to boolean false', () => {
    expect(parseUrlValue('0')).toBe(false)
  })

  it('parses "true" to boolean true', () => {
    expect(parseUrlValue('true')).toBe(true)
  })

  it('parses "1" to boolean true', () => {
    expect(parseUrlValue('1')).toBe(true)
  })

  it('returns raw string for variant values', () => {
    expect(parseUrlValue('variantA')).toBe('variantA')
    expect(parseUrlValue('v2')).toBe('v2')
  })
})

describe('parseVarValue', () => {
  it('parses "true" to boolean true', () => {
    expect(parseVarValue('true')).toBe(true)
  })

  it('parses "false" to boolean false', () => {
    expect(parseVarValue('false')).toBe(false)
  })

  it('parses integer strings to numbers', () => {
    expect(parseVarValue('42')).toBe(42)
    expect(parseVarValue('-7')).toBe(-7)
  })

  it('parses float strings to numbers', () => {
    expect(parseVarValue('3.14')).toBe(3.14)
  })

  it('returns string for non-numeric non-boolean values', () => {
    expect(parseVarValue('hello')).toBe('hello')
    expect(parseVarValue('')).toBe('')
  })

  it('does not parse whitespace-only strings as numbers', () => {
    expect(parseVarValue('  ')).toBe('  ')
  })
})
