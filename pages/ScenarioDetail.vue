<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import NetWorthChart from '@/components/NetWorthChart.vue'
import type { BucketKind } from '@/core/engine/series'
import { simulate } from '@/core/engine/simulation'
import { useScenariosStore } from '@/stores/scenarios'
import { formatCurrency, formatDate } from '@/utils/format'

const route = useRoute()
const scenarios = useScenariosStore()

const bucketKind = ref<BucketKind>('month')
const horizonYears = ref<number>(5)
const hoverDate = ref<string | null>(null)

const scenario = computed(() => scenarios.scenarios.find((s) => s.id === route.params.id))

const result = computed(() => {
  if (!scenario.value) return null
  const start = new Date()
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + horizonYears.value)
  return simulate(scenario.value, start.toISOString(), end.toISOString())
})

const series = computed(() => result.value?.series ?? [])
const entitySeries = computed(() => result.value?.entities ?? [])

const startValue = computed(() => series.value[0]?.value ?? 0)
const endValue = computed(() => series.value[series.value.length - 1]?.value ?? 0)
const delta = computed(() => endValue.value - startValue.value)

const lines = computed(() => {
  if (!scenario.value) return []
  return [
    {
      name: scenario.value.name,
      colour: scenario.value.colour,
      points: series.value,
    },
  ]
})

const nearestPointValue = (
  points: { date: string; value: number }[],
  targetMs: number,
): { date: string; value: number } | null => {
  if (points.length === 0) return null
  let bestIdx = 0
  let bestDiff = Math.abs(Date.parse(points[0]!.date) - targetMs)
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(Date.parse(points[i]!.date) - targetMs)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }
  return points[bestIdx]!
}

const displayDate = computed(() => {
  const target = hoverDate.value ?? series.value[series.value.length - 1]?.date ?? null
  if (!target) return null
  return target
})

const netWorthAtDisplay = computed(() => {
  if (!displayDate.value) return 0
  const targetMs = Date.parse(displayDate.value)
  const p = nearestPointValue(series.value, targetMs)
  return p?.value ?? 0
})

type Row = {
  id: string
  name: string
  kind: 'asset' | 'liability'
  value: number
  date: string
}

const rows = computed<Row[]>(() => {
  if (!displayDate.value) return []
  const targetMs = Date.parse(displayDate.value)
  return entitySeries.value.map((e) => {
    const p = nearestPointValue(e.points, targetMs)
    return {
      id: e.id,
      name: e.name,
      kind: e.kind,
      value: p?.value ?? 0,
      date: p?.date ?? displayDate.value!,
    }
  })
})

const assetRows = computed(() => rows.value.filter((r) => r.kind === 'asset'))
const liabilityRows = computed(() => rows.value.filter((r) => r.kind === 'liability'))
const assetSum = computed(() => assetRows.value.reduce((s, r) => s + r.value, 0))
const liabilitySum = computed(() => liabilityRows.value.reduce((s, r) => s + r.value, 0))
</script>

<template>
  <div v-if="!scenario" class="text-neutral-500">Scenario not found.</div>

  <div v-else class="space-y-6">
    <header class="flex items-center gap-3">
      <span class="w-4 h-4 rounded-full" :style="{ background: scenario.colour }" />
      <h2 class="text-2xl font-semibold">{{ scenario.name }}</h2>
    </header>

    <section class="p-6 bg-white rounded border border-neutral-200">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="font-medium">Net worth projection</h3>
        <div class="flex items-center gap-4 text-xs">
          <label class="flex items-center gap-2">
            Horizon
            <select v-model.number="horizonYears" class="px-2 py-1 border border-neutral-300 rounded">
              <option :value="1">1 yr</option>
              <option :value="3">3 yr</option>
              <option :value="5">5 yr</option>
              <option :value="10">10 yr</option>
              <option :value="20">20 yr</option>
              <option :value="30">30 yr</option>
            </select>
          </label>
          <div class="flex gap-1">
            <button
              v-for="b in (['day', 'week', 'month'] as const)"
              :key="b"
              class="px-2 py-1 rounded border"
              :class="bucketKind === b ? 'bg-blue-600 text-white border-blue-600' : 'border-neutral-300'"
              @click="bucketKind = b"
            >
              {{ b }}
            </button>
          </div>
        </div>
      </div>

      <NetWorthChart :lines="lines" :bucket-kind="bucketKind" @hover="hoverDate = $event" />

      <div class="grid grid-cols-3 gap-4 mt-4 text-sm">
        <div>
          <div class="text-xs uppercase text-neutral-500">Start</div>
          <div class="font-semibold">{{ formatCurrency(startValue) }}</div>
        </div>
        <div>
          <div class="text-xs uppercase text-neutral-500">End</div>
          <div class="font-semibold">{{ formatCurrency(endValue) }}</div>
        </div>
        <div>
          <div class="text-xs uppercase text-neutral-500">Delta</div>
          <div class="font-semibold" :class="delta >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatCurrency(delta) }}
          </div>
        </div>
      </div>
    </section>

    <section class="p-6 bg-white rounded border border-neutral-200">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-medium">
          Entity balances
          <span class="text-xs text-neutral-500 font-normal ml-2">
            at {{ displayDate ? formatDate(displayDate) : '—' }}
            <span v-if="!hoverDate" class="ml-1">(end of horizon · hover graph to scrub)</span>
          </span>
        </h3>
        <div class="text-sm font-semibold">
          Net: <span :class="netWorthAtDisplay >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatCurrency(netWorthAtDisplay) }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="flex items-center justify-between text-xs uppercase text-neutral-500 mb-2">
            <span>Assets</span>
            <span class="text-emerald-600 font-semibold">{{ formatCurrency(assetSum) }}</span>
          </div>
          <table class="w-full text-sm">
            <tbody class="divide-y">
              <tr v-for="r in assetRows" :key="r.id">
                <td class="py-2">{{ r.name }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(r.value) }}</td>
              </tr>
              <tr v-if="assetRows.length === 0">
                <td class="py-2 text-neutral-400 italic">No assets.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="flex items-center justify-between text-xs uppercase text-neutral-500 mb-2">
            <span>Liabilities</span>
            <span class="text-red-600 font-semibold">{{ formatCurrency(liabilitySum) }}</span>
          </div>
          <table class="w-full text-sm">
            <tbody class="divide-y">
              <tr v-for="r in liabilityRows" :key="r.id">
                <td class="py-2">{{ r.name }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(r.value) }}</td>
              </tr>
              <tr v-if="liabilityRows.length === 0">
                <td class="py-2 text-neutral-400 italic">No liabilities.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
