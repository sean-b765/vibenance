import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTagsStore } from '@/stores/tags'

describe('tags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds five system tags on init', () => {
    const store = useTagsStore()
    expect(store.tags).toHaveLength(5)
    expect(store.tags.every((t) => t.system)).toBe(true)
  })

  it('add creates a non-system tag with returned reference', () => {
    const store = useTagsStore()
    const tag = store.add('Travel', '#abcdef')
    expect(tag.name).toBe('Travel')
    expect(tag.colour).toBe('#abcdef')
    expect(tag.system).toBe(false)
    expect(store.tags.find((t) => t.id === tag.id)?.name).toBe('Travel')
  })

  it('rename updates the tag name', () => {
    const store = useTagsStore()
    const tag = store.add('Old', '#000000')
    store.rename(tag.id, 'New')
    expect(tag.name).toBe('New')
  })

  it('rename is a no-op for unknown id', () => {
    const store = useTagsStore()
    const before = store.tags.map((t) => t.name)
    store.rename('does-not-exist', 'X')
    expect(store.tags.map((t) => t.name)).toEqual(before)
  })

  it('remove deletes a user tag', () => {
    const store = useTagsStore()
    const tag = store.add('Travel', '#abcdef')
    store.remove(tag.id)
    expect(store.tags.find((t) => t.id === tag.id)).toBeUndefined()
  })

  it('remove refuses to delete system tags', () => {
    const store = useTagsStore()
    const system = store.tags[0]!
    store.remove(system.id)
    expect(store.tags.find((t) => t.id === system.id)).toBe(system)
  })

  it('system tags can be renamed', () => {
    const store = useTagsStore()
    const system = store.tags[0]!
    store.rename(system.id, 'Renamed')
    expect(system.name).toBe('Renamed')
  })
})
