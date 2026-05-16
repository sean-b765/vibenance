<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useScenariosStore } from '@/stores/scenarios'

const scenarios = useScenariosStore()
const newName = ref('')

const createScenario = () => {
  const name = newName.value.trim()
  if (!name) return
  scenarios.create(name)
  newName.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Scenarios</h2>
      <div class="flex gap-2">
        <input
          v-model="newName"
          placeholder="New scenario name"
          class="px-3 py-2 border border-neutral-300 rounded text-sm"
          @keyup.enter="createScenario"
        />
        <button
          class="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          @click="createScenario"
        >
          Create
        </button>
      </div>
    </header>

    <p v-if="!scenarios.hasData" class="text-neutral-500 text-sm">
      No scenarios yet. Load sample data from the dashboard.
    </p>

    <ul class="divide-y border border-neutral-200 rounded bg-white">
      <li
        v-for="s in scenarios.scenarios"
        :key="s.id"
        class="p-4 flex items-center gap-3"
      >
        <span class="w-3 h-3 rounded-full" :style="{ background: s.colour }" />
        <div class="flex-1">
          <RouterLink :to="`/scenarios/${s.id}`" class="font-medium hover:underline">
            {{ s.name }}
          </RouterLink>
          <div class="text-xs text-neutral-500">
            Horizon {{ s.horizonYears }}y · Inflation {{ (s.inflationRate * 100).toFixed(1) }}%
          </div>
        </div>
        <button
          class="text-xs text-neutral-600 hover:text-amber-600"
          @click="scenarios.toggleFavourite(s.id)"
        >
          {{ s.favourite ? '★ Favourite' : '☆ Favourite' }}
        </button>
        <button
          class="text-xs text-neutral-600 hover:text-blue-600"
          @click="scenarios.duplicate(s.id)"
        >
          Duplicate
        </button>
        <button
          v-if="s.name !== 'Base'"
          class="text-xs text-neutral-600 hover:text-red-600"
          @click="scenarios.remove(s.id)"
        >
          Delete
        </button>
      </li>
    </ul>
  </div>
</template>
