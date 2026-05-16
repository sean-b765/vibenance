<script setup lang="ts">
import { computed } from 'vue'
import NetWorthChart from '@/components/NetWorthChart.vue'
import { compute as computeNetWorth } from '@/core/engine/netWorth'
import { simulate } from '@/core/engine/simulation'
import { useScenariosStore } from '@/stores/scenarios'
import { formatCurrency } from '@/utils/format'

const scenarios = useScenariosStore()
const today = new Date().toISOString()

const favouriteLines = computed(() => {
  const start = new Date()
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 5)
  return scenarios.favourites.map((s) => ({
    name: s.name,
    colour: s.colour,
    points: simulate(s, start.toISOString(), end.toISOString()).series,
  }))
})

const netWorth = computed(() => {
  const s = scenarios.activeScenario
  if (!s) return 0
  return computeNetWorth(s.entities.assets, s.entities.liabilities, today)
})

const assetTotal = computed(() =>
  scenarios.activeScenario?.entities.assets.reduce((sum, a) => {
    const last = a.snapshots[a.snapshots.length - 1]
    return sum + (last?.value ?? 0)
  }, 0) ?? 0,
)
const liabilityTotal = computed(() =>
  scenarios.activeScenario?.entities.liabilities.reduce((sum, l) => {
    const last = l.snapshots[l.snapshots.length - 1]
    return sum + (last?.value ?? 0)
  }, 0) ?? 0,
)
</script>

<template>
  <div v-if="!scenarios.hasData" class="max-w-xl mx-auto mt-20 text-center">
    <h2 class="text-2xl font-semibold mb-2">No data yet</h2>
    <p class="text-neutral-600 mb-6">Get started by loading sample data or importing JSON.</p>
    <div class="flex gap-3 justify-center">
      <button
        class="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        @click="scenarios.loadSampleData()"
      >
        Try with sample data
      </button>
      <button
        class="px-4 py-2 rounded border border-neutral-300 text-sm hover:bg-neutral-100"
        disabled
      >
        Import JSON
      </button>
    </div>
  </div>

  <div v-else class="space-y-6">
    <header>
      <h2 class="text-2xl font-semibold">Dashboard</h2>
      <p class="text-sm text-neutral-500">
        Active scenario: {{ scenarios.activeScenario?.name }}
      </p>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-6 bg-white rounded border border-neutral-200">
        <div class="text-xs uppercase text-neutral-500 mb-1">Net worth</div>
        <div class="text-3xl font-semibold">{{ formatCurrency(netWorth) }}</div>
      </div>
      <div class="p-6 bg-white rounded border border-neutral-200">
        <div class="text-xs uppercase text-neutral-500 mb-1">Assets</div>
        <div class="text-2xl font-semibold text-emerald-600">{{ formatCurrency(assetTotal) }}</div>
      </div>
      <div class="p-6 bg-white rounded border border-neutral-200">
        <div class="text-xs uppercase text-neutral-500 mb-1">Liabilities</div>
        <div class="text-2xl font-semibold text-red-600">{{ formatCurrency(liabilityTotal) }}</div>
      </div>
    </section>

    <section class="p-6 bg-white rounded border border-neutral-200">
      <h3 class="font-medium mb-2">Composition</h3>
      <p class="text-sm text-neutral-500">Donut chart placeholder (ECharts wiring next).</p>
    </section>

    <section class="p-6 bg-white rounded border border-neutral-200">
      <h3 class="font-medium mb-2">Favourite scenarios (5y)</h3>
      <NetWorthChart
        v-if="favouriteLines.length > 0"
        :lines="favouriteLines"
        bucket-kind="month"
        height="300px"
      />
      <p v-else class="text-sm text-neutral-500">No favourites yet.</p>
    </section>

    <section class="p-6 bg-white rounded border border-neutral-200">
      <h3 class="font-medium mb-2">Warnings</h3>
      <p class="text-sm text-neutral-500">No warnings.</p>
    </section>
  </div>
</template>
