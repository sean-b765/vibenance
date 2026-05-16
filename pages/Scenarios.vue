<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
        <Input
          v-model="newName"
          placeholder="New scenario name"
          @keyup.enter="createScenario"
        />
        <Button @click="createScenario">Create</Button>
      </div>
    </header>

    <p v-if="!scenarios.hasData" class="text-muted-foreground text-sm">
      No scenarios yet. Load sample data from the dashboard.
    </p>

    <ul class="divide-y rounded-md border bg-card">
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
          <div class="text-xs text-muted-foreground">
            Horizon {{ s.horizonYears }}y · Inflation {{ (s.inflationRate * 100).toFixed(1) }}%
          </div>
        </div>
        <Button size="sm" variant="ghost" @click="scenarios.toggleFavourite(s.id)">
          {{ s.favourite ? '★ Favourite' : '☆ Favourite' }}
        </Button>
        <Button size="sm" variant="ghost" @click="scenarios.duplicate(s.id)">Duplicate</Button>
        <Button
          v-if="s.name !== 'Base'"
          size="sm"
          variant="ghost"
          class="text-destructive hover:text-destructive"
          @click="scenarios.remove(s.id)"
        >
          Delete
        </Button>
      </li>
    </ul>
  </div>
</template>
