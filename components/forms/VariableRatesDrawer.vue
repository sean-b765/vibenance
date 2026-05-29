<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp } from 'lucide-vue-next'
import VariableRatesEditor from '@/components/forms/VariableRatesEditor.vue'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { RatePeriod } from '@/core/schemas/growth'

const props = defineProps<{
  modelValue: RatePeriod[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: RatePeriod[]): void
}>()

const count = computed(() => props.modelValue.length)
const triggerLabel = computed(() =>
  count.value === 0
    ? 'Add variable rates'
    : `${count.value} variable ${count.value === 1 ? 'rate' : 'rates'}`,
)

const onUpdate = (value: RatePeriod[]) => emit('update:modelValue', value)
</script>

<template>
  <Drawer>
    <DrawerTrigger as-child>
      <Button type="button" variant="outline" size="sm" class="gap-2 self-start">
        <TrendingUp class="size-4" />
        {{ triggerLabel }}
      </Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Variable rates</DrawerTitle>
        <DrawerDescription>
          Override the base rate inside specific date ranges. Outside any range the base rate applies.
        </DrawerDescription>
      </DrawerHeader>
      <div class="px-4 pb-4 overflow-y-auto">
        <VariableRatesEditor :model-value="props.modelValue" @update:model-value="onUpdate" />
      </div>
      <DrawerFooter>
        <DrawerClose as-child>
          <Button type="button" size="sm">Done</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
