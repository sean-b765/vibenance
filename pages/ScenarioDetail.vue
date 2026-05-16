<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '@/components/forms/AppSelect.vue'
import NetWorthChart from '@/components/NetWorthChart.vue'
import { Button } from '@/components/ui/button'
import type { BucketKind } from '@/core/engine/series'
import { simulate } from '@/core/engine/simulation'
import type { Scenario } from '@/core/schemas/scenario'
import { useScenariosStore } from '@/stores/scenarios'
import { formatCurrency, formatDate } from '@/utils/format'

const route = useRoute()
const scenarios = useScenariosStore()

const bucketKind = ref<BucketKind>('month')
const horizonYears = ref<number>(5)
const hoverDate = ref<string | null>(null)

const scenario = computed(() => scenarios.scenarios.find((s) => s.id === route.params.id))

const disabledIds = ref<Set<string>>(new Set())
const isDisabled = (id: string) => disabledIds.value.has(id)
const toggleDisabled = (id: string) => {
  const next = new Set(disabledIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  disabledIds.value = next
}

const effectiveScenario = computed<Scenario | null>(() => {
  if (!scenario.value) return null
  const keep = <T extends { id: string }>(arr: T[]) =>
    arr.filter((e) => !disabledIds.value.has(e.id))
  return {
    ...scenario.value,
    entities: {
      assets: keep(scenario.value.entities.assets),
      liabilities: keep(scenario.value.entities.liabilities),
      incomes: keep(scenario.value.entities.incomes),
      expenses: keep(scenario.value.entities.expenses),
      transfers: keep(scenario.value.entities.transfers),
    },
  }
})

const result = computed(() => {
  if (!effectiveScenario.value) return null
  const start = new Date()
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + horizonYears.value)
  return simulate(effectiveScenario.value, start.toISOString(), end.toISOString())
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
}

const seriesById = computed(() => {
  const map = new Map<string, { date: string; value: number }[]>()
  for (const e of entitySeries.value) map.set(e.id, e.points)
  return map
})

const buildRow = (id: string, name: string, kind: 'asset' | 'liability'): Row => {
  if (isDisabled(id) || !displayDate.value) {
    return { id, name, kind, value: 0 }
  }
  const points = seriesById.value.get(id)
  if (!points) return { id, name, kind, value: 0 }
  const p = nearestPointValue(points, Date.parse(displayDate.value))
  return { id, name, kind, value: p?.value ?? 0 }
}

const assetRows = computed<Row[]>(() =>
  scenario.value?.entities.assets.map((a) => buildRow(a.id, a.name, 'asset')) ?? [],
)
const liabilityRows = computed<Row[]>(() =>
  scenario.value?.entities.liabilities.map((l) => buildRow(l.id, l.name, 'liability')) ?? [],
)
const assetSum = computed(() => assetRows.value.reduce((s, r) => s + r.value, 0))
const liabilitySum = computed(() => liabilityRows.value.reduce((s, r) => s + r.value, 0))

const yearlyMultiplier = (kind: string | null | undefined): number => {
  switch (kind) {
    case 'daily': return 365
    case 'weekly': return 52
    case 'fortnightly': return 26
    case 'monthly': return 12
    case 'annually': return 1
    default: return 0
  }
}
const annualised = (amount: number, kind: string | null | undefined) =>
  amount * yearlyMultiplier(kind)

const incomeTotal = computed(() =>
  scenario.value
    ? scenario.value.entities.incomes
        .filter((i) => !isDisabled(i.id))
        .reduce((s, i) => s + annualised(i.amount, i.frequency?.kind ?? null), 0)
    : 0,
)
const expenseTotal = computed(() =>
  scenario.value
    ? scenario.value.entities.expenses
        .filter((e) => !isDisabled(e.id))
        .reduce((s, e) => s + annualised(e.amount, e.frequency?.kind ?? null), 0)
    : 0,
)
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
          <div class="flex items-center gap-2">
            <span>Horizon</span>
            <div class="min-w-[100px]">
              <AppSelect
                :model-value="horizonYears"
                :options="[
                  { value: 1, label: '1 yr' },
                  { value: 3, label: '3 yr' },
                  { value: 5, label: '5 yr' },
                  { value: 10, label: '10 yr' },
                  { value: 20, label: '20 yr' },
                  { value: 30, label: '30 yr' },
                ]"
                @update:model-value="(v) => horizonYears = Number(v) || 5"
              />
            </div>
          </div>
          <div class="flex gap-1">
            <Button
              v-for="b in (['day', 'week', 'month'] as const)"
              :key="b"
              size="sm"
              :variant="bucketKind === b ? 'default' : 'outline'"
              @click="bucketKind = b"
            >
              {{ b }}
            </Button>
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
              <tr v-for="r in assetRows" :key="r.id" :class="isDisabled(r.id) ? 'opacity-40' : ''">
                <td class="py-2 w-8">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground"
                    @click="toggleDisabled(r.id)"
                  >
                    <component :is="isDisabled(r.id) ? EyeOff : Eye" class="size-4" />
                  </button>
                </td>
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
              <tr v-for="r in liabilityRows" :key="r.id" :class="isDisabled(r.id) ? 'opacity-40' : ''">
                <td class="py-2 w-8">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground"
                    @click="toggleDisabled(r.id)"
                  >
                    <component :is="isDisabled(r.id) ? EyeOff : Eye" class="size-4" />
                  </button>
                </td>
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

    <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 bg-card rounded-md border">
        <div class="flex items-center justify-between text-xs uppercase text-muted-foreground mb-2">
          <span>Incomes ({{ scenario.entities.incomes.length }})</span>
          <span class="text-emerald-600 font-semibold">
            +{{ formatCurrency(incomeTotal) }}/yr
          </span>
        </div>
        <table class="w-full text-sm">
          <tbody class="divide-y">
            <tr v-for="i in scenario.entities.incomes" :key="i.id" :class="isDisabled(i.id) ? 'opacity-40' : ''">
              <td class="py-2 w-8">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-foreground"
                  @click="toggleDisabled(i.id)"
                >
                  <component :is="isDisabled(i.id) ? EyeOff : Eye" class="size-4" />
                </button>
              </td>
              <td class="py-2">
                <div class="font-medium">{{ i.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ i.type }} · {{ i.frequency?.kind ?? 'one-off' }}
                </div>
              </td>
              <td class="py-2 text-right font-medium text-emerald-600">
                +{{ formatCurrency(i.amount) }}
              </td>
            </tr>
            <tr v-if="scenario.entities.incomes.length === 0">
              <td class="py-2 text-muted-foreground italic">No incomes.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="p-4 bg-card rounded-md border">
        <div class="flex items-center justify-between text-xs uppercase text-muted-foreground mb-2">
          <span>Expenses ({{ scenario.entities.expenses.length }})</span>
          <span class="text-red-600 font-semibold">
            -{{ formatCurrency(expenseTotal) }}/yr
          </span>
        </div>
        <table class="w-full text-sm">
          <tbody class="divide-y">
            <tr v-for="e in scenario.entities.expenses" :key="e.id" :class="isDisabled(e.id) ? 'opacity-40' : ''">
              <td class="py-2 w-8">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-foreground"
                  @click="toggleDisabled(e.id)"
                >
                  <component :is="isDisabled(e.id) ? EyeOff : Eye" class="size-4" />
                </button>
              </td>
              <td class="py-2">
                <div class="font-medium">{{ e.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ e.type }} · {{ e.frequency?.kind ?? 'one-off' }}
                </div>
              </td>
              <td class="py-2 text-right font-medium text-red-600">
                -{{ formatCurrency(e.amount) }}
              </td>
            </tr>
            <tr v-if="scenario.entities.expenses.length === 0">
              <td class="py-2 text-muted-foreground italic">No expenses.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="scenario.entities.transfers.length > 0" class="p-4 bg-card rounded-md border">
      <div class="text-xs uppercase text-muted-foreground mb-2">
        Transfers ({{ scenario.entities.transfers.length }})
      </div>
      <table class="w-full text-sm">
        <tbody class="divide-y">
          <tr v-for="t in scenario.entities.transfers" :key="t.id" :class="isDisabled(t.id) ? 'opacity-40' : ''">
            <td class="py-2 w-8">
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground"
                @click="toggleDisabled(t.id)"
              >
                <component :is="isDisabled(t.id) ? EyeOff : Eye" class="size-4" />
              </button>
            </td>
            <td class="py-2">
              <div class="font-medium">{{ t.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ t.type }} · {{ t.frequency?.kind ?? 'one-off' }}
              </div>
            </td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(t.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
