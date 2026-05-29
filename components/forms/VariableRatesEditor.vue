<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import DateRangePopover from '@/components/forms/DateRangePopover.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RatePeriod } from '@/core/schemas/growth'

const props = defineProps<{
  modelValue: RatePeriod[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: RatePeriod[]): void
}>()

const pendingRemoveIndex = ref<number | null>(null)
const dialogOpen = computed({
  get: () => pendingRemoveIndex.value !== null,
  set: (v) => {
    if (!v) pendingRemoveIndex.value = null
  },
})

const emitUpdate = (next: RatePeriod[]) => emit('update:modelValue', next)

const requestRemove = (index: number) => {
  pendingRemoveIndex.value = index
}

const confirmRemove = () => {
  const i = pendingRemoveIndex.value
  if (i === null) return
  emitUpdate(props.modelValue.filter((_, idx) => idx !== i))
  pendingRemoveIndex.value = null
}

const updateAt = (index: number, patch: Partial<RatePeriod>) => {
  const next = props.modelValue.map((p, i) => {
    if (i !== index) return p
    const merged = { ...p, ...patch } as RatePeriod
    if (patch.endDate === undefined && 'endDate' in patch) {
      const { endDate: _omit, ...rest } = merged
      return rest as RatePeriod
    }
    return merged
  })
  emitUpdate(next)
}

const onRange = (index: number, value: { startDate: string; endDate?: string }) => {
  updateAt(index, { startDate: value.startDate, endDate: value.endDate })
}

const clearEnd = (index: number) => {
  updateAt(index, { endDate: undefined })
}

const onRate = (index: number, value: string | number) => {
  const num = typeof value === 'number' ? value : Number(value)
  updateAt(index, { rate: Number.isFinite(num) ? num : 0 })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(period, index) in props.modelValue"
      :key="index"
      data-testid="rate-row"
      class="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 items-end p-2 bg-background rounded-md border"
    >
      <div class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">Date range</span>
        <DateRangePopover
          :start-date="period.startDate"
          :end-date="period.endDate"
          @update:range="(v) => onRange(index, v)"
          @clear-end="clearEnd(index)"
        />
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">Rate</span>
        <Input
          type="number"
          step="0.0001"
          data-testid="rate-input"
          :model-value="period.rate"
          @update:model-value="(v) => onRate(index, v)"
        />
      </div>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        data-testid="remove-rate"
        @click="requestRemove(index)"
      >
        Remove
      </Button>
    </div>

    <ConfirmationDialog
      v-model:open="dialogOpen"
      title="Remove variable rate?"
      description="This rate period will be removed. The base rate will apply for this range."
      confirm-label="Remove rate"
      @confirm="confirmRemove"
    />
  </div>
</template>
