<script setup lang="ts">
import { computed, ref } from 'vue'
import { useScenariosStore } from '@/stores/scenarios'

const props = defineProps<{
  fromScenarioId: string
  entityId: string
  kind: 'assets' | 'liabilities' | 'incomes' | 'expenses' | 'transfers'
}>()

const scenarios = useScenariosStore()
const target = ref('')

const targets = computed(() =>
  scenarios.scenarios.filter((s) => s.id !== props.fromScenarioId),
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
    class="flex items-center gap-2 p-3 bg-white rounded border border-neutral-200"
  >
    <span class="text-xs uppercase text-neutral-500">Move/clone to</span>
    <select
      v-model="target"
      class="border border-neutral-300 rounded px-2 py-1 text-sm flex-1"
    >
      <option value="">— select scenario —</option>
      <option v-for="s in targets" :key="s.id" :value="s.id">{{ s.name }}</option>
    </select>
    <button
      class="px-2 py-1 rounded text-xs border border-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
      :disabled="!target"
      @click="clone"
    >
      Clone
    </button>
    <button
      class="px-2 py-1 rounded text-xs border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      :disabled="!target"
      @click="move"
    >
      Move
    </button>
  </div>
</template>
