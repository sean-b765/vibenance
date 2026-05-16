<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  modelValue: T | ''
  options: { value: T; label: string; colour?: string }[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T | ''): void
}>()

const onUpdate = (v: unknown) => {
  if (v === undefined || v === null || v === '') {
    emit('update:modelValue', '')
    return
  }
  emit('update:modelValue', v as T)
}

const selected = computed(() =>
  props.options.find((o) => String(o.value) === String(props.modelValue)),
)
</script>

<template>
  <Select :model-value="props.modelValue as string" @update:model-value="onUpdate">
    <SelectTrigger class="w-full">
      <span v-if="selected" class="flex items-center gap-2 truncate">
        <span
          v-if="selected.colour"
          class="inline-block size-2.5 rounded-full shrink-0"
          :style="{ background: selected.colour }"
        />
        <span class="truncate">{{ selected.label }}</span>
      </span>
      <SelectValue v-else :placeholder="placeholder ?? 'Select…'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="o in options" :key="String(o.value)" :value="String(o.value)">
        <span class="flex items-center gap-2">
          <span
            v-if="o.colour"
            class="inline-block size-2.5 rounded-full shrink-0"
            :style="{ background: o.colour }"
          />
          <span>{{ o.label }}</span>
        </span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
