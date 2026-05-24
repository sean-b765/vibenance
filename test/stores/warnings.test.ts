import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useScenariosStore } from '@/stores/scenarios'
import { useWarningsStore } from '@/stores/warnings'

describe('warnings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty warnings with no scenarios', () => {
    const w = useWarningsStore()
    expect(w.favouriteWarnings).toEqual([])
    expect(w.activeScenarioWarnings).toEqual([])
  })

  it('flags warnings on sample data scenarios', () => {
    const scenarios = useScenariosStore()
    scenarios.loadSampleData()
    const w = useWarningsStore()
    expect(w.warningsByScenario).toBeDefined()
    expect(Object.keys(w.warningsByScenario).length).toBe(scenarios.scenarios.length)
  })

  it('favouriteWarnings includes only favourite scenarios', () => {
    const scenarios = useScenariosStore()
    scenarios.loadSampleData()
    const fav = scenarios.favourites
    const w = useWarningsStore()
    expect(w.favouriteWarnings.length).toBe(fav.length)
  })
})
