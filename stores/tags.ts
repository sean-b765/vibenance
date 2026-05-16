import { defineStore } from 'pinia'
import { ref } from 'vue'
import { uuidv7 } from 'uuidv7'
import type { Tag } from '@/core/schemas/tag'
import { systemTags } from '@/utils/sampleData'

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>(systemTags())

  const add = (name: string, colour: string): Tag => {
    const tag: Tag = { id: uuidv7(), name, colour, system: false }
    tags.value.push(tag)
    return tag
  }
  const rename = (id: string, name: string) => {
    const tag = tags.value.find((t) => t.id === id)
    if (!tag) return
    tag.name = name
  }
  const remove = (id: string) => {
    const tag = tags.value.find((t) => t.id === id)
    if (!tag || tag.system) return
    tags.value = tags.value.filter((t) => t.id !== id)
  }

  return { tags, add, rename, remove }
})
