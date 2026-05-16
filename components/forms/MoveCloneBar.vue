<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSelect from '@/components/forms/AppSelect.vue'
import { Button } from '@/components/ui/button'
import { useScenariosStore } from '@/stores/scenarios'

const props = defineProps<{
  fromScenarioId: string
  entityId: string
  kind: 'assets' | 'liabilities' | 'incomes' | 'expenses' | 'transfers'
}>()

const scenarios = useScenariosStore()
const target = ref<string | ''>('')

const targets = computed(() =>
  scenarios.scenarios.filter((s) => s.id !== props.fromScenarioId),
)
const targetOptions = computed(() =>
  targets.value.map((s) => ({ value: s.id, label: s.name, colour: s.colour })),
)

const move = () => {
  if (!target.value) return
  scenarios.moveEntity(props.fromScenarioId, target.value, props.kind, props.entityId)
  target.value = ''
}
const clone = () => {
  if (!target.value) return
  scenarios.cloneEntity(props.fromScenarioId, target.value, props.kind, props.entityId)
  target.value = ''
}
</script>

<template>
  <div
    v-if="targets.length > 0"
    class="flex flex-wrap items-center gap-2 p-3 bg-card rounded-md border"
  >
    <span class="text-xs uppercase text-muted-foreground">Move/clone to</span>
    <div class="flex-1 min-w-[180px]">
      <AppSelect v-model="target" :options="targetOptions" placeholder="— select scenario —" />
    </div>
    <Button size="sm" variant="outline" :disabled="!target" @click="clone">Clone</Button>
    <Button size="sm" :disabled="!target" @click="move">Move</Button>
  </div>
</template>
