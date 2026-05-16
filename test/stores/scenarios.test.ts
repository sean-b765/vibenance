import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useScenariosStore } from '@/stores/scenarios'

describe('scenarios store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useScenariosStore()
    expect(store.scenarios).toEqual([])
    expect(store.activeScenarioId).toBeNull()
    expect(store.activeScenario).toBeNull()
    expect(store.hasData).toBe(false)
    expect(store.favourites).toEqual([])
  })

  it('loadSampleData seeds two scenarios and selects the base as active', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    expect(store.scenarios).toHaveLength(2)
    expect(store.activeScenario?.name).toBe('Base')
    expect(store.hasData).toBe(true)
  })

  it('ensureBaseScenario creates a base only when empty', () => {
    const store = useScenariosStore()
    store.ensureBaseScenario()
    expect(store.scenarios).toHaveLength(1)
    expect(store.scenarios[0]?.name).toBe('Base')
    store.ensureBaseScenario()
    expect(store.scenarios).toHaveLength(1)
  })

  it('create appends a new scenario', () => {
    const store = useScenariosStore()
    const s = store.create('Sabbatical')
    expect(store.scenarios.find((x) => x.id === s.id)?.name).toBe('Sabbatical')
    expect(s.entities.assets).toEqual([])
  })

  it('create does not change activeScenarioId', () => {
    const store = useScenariosStore()
    expect(store.activeScenarioId).toBeNull()
    store.create('First')
    expect(store.activeScenarioId).toBeNull()
  })

  it('activeScenario falls back to the first scenario when none explicitly selected', () => {
    const store = useScenariosStore()
    const a = store.create('A')
    store.create('B')
    expect(store.activeScenarioId).toBeNull()
    expect(store.activeScenario?.id).toBe(a.id)
  })

  it('activeScenario follows explicit selection over fallback', () => {
    const store = useScenariosStore()
    store.create('A')
    const b = store.create('B')
    store.setActive(b.id)
    expect(store.activeScenario?.id).toBe(b.id)
  })

  it('duplicate creates an independent copy with a fresh id and "(copy)" suffix', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const original = store.scenarios[0]!
    const copy = store.duplicate(original.id)!
    expect(copy.id).not.toBe(original.id)
    expect(copy.name).toBe(`${original.name} (copy)`)
    expect(copy.favourite).toBe(false)
    expect(copy.entities.assets).not.toBe(original.entities.assets)
    copy.entities.assets[0]!.name = 'Mutated'
    expect(original.entities.assets[0]?.name).not.toBe('Mutated')
  })

  it('duplicate returns null for unknown id', () => {
    const store = useScenariosStore()
    expect(store.duplicate('nope')).toBeNull()
  })

  it('rename updates the name', () => {
    const store = useScenariosStore()
    const s = store.create('Old')
    store.rename(s.id, 'New')
    expect(s.name).toBe('New')
  })

  it('remove deletes non-base scenarios', () => {
    const store = useScenariosStore()
    const s = store.create('Extra')
    store.remove(s.id)
    expect(store.scenarios.find((x) => x.id === s.id)).toBeUndefined()
  })

  it('remove refuses to delete the Base scenario', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const base = store.scenarios.find((s) => s.name === 'Base')!
    store.remove(base.id)
    expect(store.scenarios).toContain(base)
  })

  it('remove clears activeScenarioId when removing the active scenario', () => {
    const store = useScenariosStore()
    const a = store.create('A')
    const b = store.create('B')
    store.setActive(b.id)
    store.remove(b.id)
    expect(store.activeScenarioId).toBe(a.id)
  })

  it('toggleFavourite flips the favourite flag', () => {
    const store = useScenariosStore()
    const s = store.create('Test')
    expect(s.favourite).toBe(false)
    store.toggleFavourite(s.id)
    expect(s.favourite).toBe(true)
    store.toggleFavourite(s.id)
    expect(s.favourite).toBe(false)
  })

  it('favourites computed lists only favourited scenarios', () => {
    const store = useScenariosStore()
    const a = store.create('A')
    store.create('B')
    store.toggleFavourite(a.id)
    expect(store.favourites.map((s) => s.id)).toEqual([a.id])
  })

  it('setColour updates the scenario colour', () => {
    const store = useScenariosStore()
    const s = store.create('Test')
    store.setColour(s.id, '#abcdef')
    expect(s.colour).toBe('#abcdef')
  })

  it('setActive switches active scenario', () => {
    const store = useScenariosStore()
    const a = store.create('A')
    const b = store.create('B')
    store.setActive(a.id)
    expect(store.activeScenario?.id).toBe(a.id)
    store.setActive(b.id)
    expect(store.activeScenario?.id).toBe(b.id)
  })

  it('reset clears all state', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    store.reset()
    expect(store.scenarios).toEqual([])
    expect(store.activeScenarioId).toBeNull()
  })

  it('upsertAsset adds a new asset when id is unknown', () => {
    const store = useScenariosStore()
    const s = store.create('Test')
    store.upsertAsset(s.id, {
      id: '00000000-0000-7000-8000-000000000099',
      name: 'New Cash',
      type: 'account_cash',
      startDate: '2026-01-01T00:00:00.000Z',
      snapshots: [],
      growth: { type: 'simple', rate: 0 },
      tagIds: [],
    })
    expect(s.entities.assets).toHaveLength(1)
    expect(s.entities.assets[0]?.name).toBe('New Cash')
  })

  it('upsertAsset replaces an existing asset when id matches', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const s = store.activeScenario!
    const existing = s.entities.assets[0]!
    store.upsertAsset(s.id, { ...existing, name: 'Renamed' })
    expect(s.entities.assets.find((a) => a.id === existing.id)?.name).toBe('Renamed')
    expect(s.entities.assets).toHaveLength(5)
  })

  it('removeEntity removes by id', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const s = store.activeScenario!
    const a = s.entities.assets[0]!
    store.removeEntity(s.id, 'assets', a.id)
    expect(s.entities.assets.find((x) => x.id === a.id)).toBeUndefined()
  })

  it('moveEntity transfers an entity to another scenario, preserving id', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const src = store.scenarios[0]!
    const dst = store.scenarios[1]!
    const asset = src.entities.assets[0]!
    const beforeDst = dst.entities.assets.length
    store.moveEntity(src.id, dst.id, 'assets', asset.id)
    expect(src.entities.assets.find((a) => a.id === asset.id)).toBeUndefined()
    expect(dst.entities.assets.find((a) => a.id === asset.id)?.name).toBe(asset.name)
    expect(dst.entities.assets).toHaveLength(beforeDst + 1)
  })

  it('moveEntity is a no-op when source and target are the same', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const s = store.scenarios[0]!
    const asset = s.entities.assets[0]!
    const before = s.entities.assets.length
    store.moveEntity(s.id, s.id, 'assets', asset.id)
    expect(s.entities.assets).toHaveLength(before)
  })

  it('cloneEntity copies entity into target scenario with fresh id', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const src = store.scenarios[0]!
    const dst = store.scenarios[1]!
    const liability = src.entities.liabilities[0]!
    const copy = store.cloneEntity(src.id, dst.id, 'liabilities', liability.id)!
    expect(copy.id).not.toBe(liability.id)
    expect(copy.name).toBe(liability.name)
    expect(src.entities.liabilities.find((l) => l.id === liability.id)).toBeDefined()
    expect(dst.entities.liabilities.find((l) => l.id === copy.id)).toBeDefined()
  })

  it('cloneEntity deep-copies snapshots so edits do not leak', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const src = store.scenarios[0]!
    const dst = store.scenarios[1]!
    const asset = src.entities.assets[0]!
    const copy = store.cloneEntity(src.id, dst.id, 'assets', asset.id)!
    expect(copy.snapshots).not.toBe(asset.snapshots)
    copy.snapshots.push({ date: '2030-01-01T00:00:00.000Z', value: 999, actual: true })
    expect(asset.snapshots.find((s) => s.value === 999)).toBeUndefined()
  })

  it('cloneEntity returns null for unknown entity', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const src = store.scenarios[0]!
    const dst = store.scenarios[1]!
    expect(store.cloneEntity(src.id, dst.id, 'assets', 'nope')).toBeNull()
  })

  it('appendSnapshot pushes an actual snapshot to an asset', () => {
    const store = useScenariosStore()
    store.loadSampleData()
    const s = store.activeScenario!
    const a = s.entities.assets[0]!
    const before = a.snapshots.length
    store.appendSnapshot(s.id, 'assets', a.id, 9_999)
    expect(a.snapshots).toHaveLength(before + 1)
    expect(a.snapshots[a.snapshots.length - 1]?.value).toBe(9_999)
    expect(a.snapshots[a.snapshots.length - 1]?.actual).toBe(true)
  })
})
