import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/stores/settings'

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initialises with AU defaults', () => {
    const store = useSettingsStore()
    expect(store.settings.currency).toBe('AUD')
    expect(store.settings.inflationRate).toBe(0.025)
    expect(store.settings.taxConfig.jurisdiction).toBe('AU')
    expect(store.settings.taxConfig.brackets.length).toBeGreaterThan(0)
  })

  it('setInflationRate updates rate', () => {
    const store = useSettingsStore()
    store.setInflationRate(0.04)
    expect(store.settings.inflationRate).toBe(0.04)
  })

  it('reset restores defaults', () => {
    const store = useSettingsStore()
    store.setInflationRate(0.1)
    store.reset()
    expect(store.settings.inflationRate).toBe(0.025)
  })
})
