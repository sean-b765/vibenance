<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { renderWarning } from '@/core/i18n/warnings'
import type { Warning } from '@/core/validation/warnings'

defineProps<{
  warnings: Warning[]
}>()

const emit = defineEmits<{
  (e: 'select', warning: Warning): void
}>()

const onSelect = (w: Warning) => emit('select', w)
</script>

<template>
  <ul v-if="warnings.length > 0" class="space-y-1">
    <li
      v-for="(w, i) in warnings"
      :key="`${w.entityId}-${w.code}-${i}`"
      class="flex items-start gap-2 text-sm rounded px-2 py-1 hover:bg-muted cursor-pointer"
      @click="onSelect(w)"
    >
      <AlertTriangle class="size-4 mt-0.5 shrink-0 text-amber-500" />
      <span>{{ renderWarning(w.entityName, w.code, w.messageParams) }}</span>
    </li>
  </ul>
  <p v-else class="text-sm text-muted-foreground">No warnings.</p>
</template>
