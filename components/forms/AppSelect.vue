<script setup lang="ts" generic="T extends string | number">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{
  modelValue: T | ''
  options: { value: T; label: string }[]
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
</script>

<template>
  <Select :model-value="props.modelValue as string" @update:model-value="onUpdate">
    <SelectTrigger class="w-full">
      <SelectValue :placeholder="placeholder ?? 'Select…'" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="o in options" :key="String(o.value)" :value="String(o.value)">
        {{ o.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
