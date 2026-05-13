import { vi, beforeEach } from 'vitest'

class LocalStorageMock {
  private store = new Map<string, string>()

  getItem(key: string) { return this.store.get(key) ?? null }
  setItem(key: string, val: string) { this.store.set(key, val) }
  removeItem(key: string) { this.store.delete(key) }
  clear() { this.store.clear() }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  get length() { return this.store.size }
}

vi.stubGlobal('localStorage', new LocalStorageMock())

beforeEach(() => {
  localStorage.clear()
})
