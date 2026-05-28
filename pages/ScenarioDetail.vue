<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppSelect from '@/components/forms/AppSelect.vue'
import InlineEdit from '@/components/inputs/InlineEdit.vue'
import NetWorthChart from '@/components/NetWorthChart.vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { BucketKind } from '@/core/engine/series'
import { simulate } from '@/core/engine/simulation'
import type { Scenario } from '@/core/schemas/scenario'
import { useScenariosStore } from '@/stores/scenarios'
import { useWarningsStore } from '@/stores/warnings'
import { formatCurrency, formatDate, formatSignedPercent } from '@/utils/format'

const route = useRoute()
const scenarios = useScenariosStore()
const warningsStore = useWarningsStore()

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

const ENTITY_PALETTE = [
  '#3b82f6', '#f97316', '#10b981', '#a855f7', '#ec4899',
  '#14b8a6', '#eab308', '#6366f1', '#ef4444', '#84cc16',
]

const lines = computed(() => {
  if (!scenario.value) return []
  const main = {
    name: "Net Worth",
    colour: scenario.value.colour,
    points: series.value,
    area: true,
    width: 3,
  }
  const entityLines = entitySeries.value.map((e, i) => ({
    name: e.name,
    colour: ENTITY_PALETTE[i % ENTITY_PALETTE.length]!,
    points: e.points,
    width: 1.5,
  }))
  return [main, ...entityLines]
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
  currentValue: number
  pctChange: number | null
}

const seriesById = computed(() => {
  const map = new Map<string, { date: string; value: number }[]>()
  for (const e of entitySeries.value) map.set(e.id, e.points)
  return map
})

const buildRow = (id: string, name: string, kind: 'asset' | 'liability'): Row => {
  if (isDisabled(id) || !displayDate.value) {
    return { id, name, kind, value: 0, currentValue: 0, pctChange: null }
  }
  const points = seriesById.value.get(id)
  if (!points) return { id, name, kind, value: 0, currentValue: 0, pctChange: null }
  const p = nearestPointValue(points, Date.parse(displayDate.value))
  const currentValue = points[0]?.value ?? 0
  const value = p?.value ?? 0
  const pctChange = currentValue !== 0 ? (value - currentValue) / Math.abs(currentValue) : null
  return { id, name, kind, value, currentValue, pctChange }
}

const assetRows = computed<Row[]>(() =>
  scenario.value?.entities.assets.map((a) => buildRow(a.id, a.name, 'asset')) ?? [],
)
const liabilityRows = computed<Row[]>(() =>
  scenario.value?.entities.liabilities.map((l) => buildRow(l.id, l.name, 'liability')) ?? [],
)
const assetSum = computed(() => assetRows.value.reduce((s, r) => s + r.value, 0))
const liabilitySum = computed(() => liabilityRows.value.reduce((s, r) => s + r.value, 0))
const assetCurrentSum = computed(() => assetRows.value.reduce((s, r) => s + r.currentValue, 0))
const liabilityCurrentSum = computed(() => liabilityRows.value.reduce((s, r) => s + r.currentValue, 0))
const assetPctChange = computed(() =>
  assetCurrentSum.value !== 0
    ? (assetSum.value - assetCurrentSum.value) / Math.abs(assetCurrentSum.value)
    : null,
)
const liabilityPctChange = computed(() =>
  liabilityCurrentSum.value !== 0
    ? (liabilitySum.value - liabilityCurrentSum.value) / Math.abs(liabilityCurrentSum.value)
    : null,
)
const netCurrent = computed(() => assetCurrentSum.value - liabilityCurrentSum.value)
const netPctChange = computed(() =>
  netCurrent.value !== 0
    ? (netWorthAtDisplay.value - netCurrent.value) / Math.abs(netCurrent.value)
    : null,
)

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
const onRename = (next: string) => {
  if (!scenario.value) return
  scenarios.rename(scenario.value.id, next)
}
const onColourChange = (e: Event) => {
  if (!scenario.value) return
  const value = (e.target as HTMLInputElement).value
  scenarios.setColour(scenario.value.id, value)
}

const expenseTotal = computed(() =>
  scenario.value
    ? scenario.value.entities.expenses
      .filter((e) => !isDisabled(e.id))
      .reduce((s, e) => s + annualised(e.amount, e.frequency?.kind ?? null), 0)
    : 0,
)
</script>

<template>
  <div v-if="!scenario" class="text-muted-foreground">Scenario not found.</div>

  <div v-else class="space-y-6">

    <section class="p-4 bg-card rounded border border-border">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div class="flex items-center gap-3">
          <label class="relative cursor-pointer" title="Change colour">
            <span class="block w-5 h-5 rounded-full border border-border" :style="{ background: scenario.colour }" />
            <input type="color" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" :value="scenario.colour"
              @input="onColourChange" />
          </label>
          <InlineEdit :model-value="scenario.name" aria-label="Rename" label-class="text-2xl font-semibold"
            input-class="text-2xl md:text-2xl font-semibold h-10" @update:model-value="onRename" />
        </div>
        <div class="flex items-center gap-4 text-xs">
          <div class="flex items-center gap-2">
            <span>Horizon</span>
            <div class="min-w-[100px]">
              <AppSelect :model-value="horizonYears" :options="[
                { value: 1, label: '1 yr' },
                { value: 3, label: '3 yr' },
                { value: 5, label: '5 yr' },
                { value: 10, label: '10 yr' },
                { value: 20, label: '20 yr' },
                { value: 30, label: '30 yr' },
              ]" @update:model-value="(v) => horizonYears = Number(v) || 5" />
            </div>
          </div>
          <div class="flex gap-1">
            <Button v-for="b in (['day', 'week', 'month'] as const)" :key="b" size="sm"
              :variant="bucketKind === b ? 'default' : 'outline'" @click="bucketKind = b">
              {{ b }}
            </Button>
          </div>
        </div>
      </div>

      <NetWorthChart :lines="lines" :bucket-kind="bucketKind" @hover="hoverDate = $event" />

      <div class="grid grid-cols-3 gap-4 mt-4 text-sm">
        <div>
          <div class="text-xs uppercase text-muted-foreground">Start</div>
          <div class="font-semibold">{{ formatCurrency(startValue) }}</div>
        </div>
        <div>
          <div class="text-xs uppercase text-muted-foreground">End</div>
          <div class="font-semibold">{{ formatCurrency(endValue) }}</div>
        </div>
        <div>
          <div class="text-xs uppercase text-muted-foreground">Change</div>
          <div class="font-semibold" :class="delta >= 0 ? 'text-emerald-600' : 'text-red-600'">
            {{ formatCurrency(delta) }}
          </div>
        </div>
      </div>
    </section>

    <section class="p-4 bg-card rounded border border-border">
      <TooltipProvider :delay-duration="150">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div class="flex items-center justify-between text-xs uppercase text-muted-foreground mb-2">
              <span>Assets ({{ assetRows.length }})</span>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="font-semibold">
                    {{ formatCurrency(assetSum) }}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span v-if="assetPctChange === null || assetPctChange === 0" class="text-xs font-semibold">
                    No Change
                  </span>
                  <template v-else>
                  <span class="text-xs font-semibold">
                    {{ formatCurrency(assetCurrentSum) }} → {{ formatCurrency(assetSum) }}
                  </span>
                  <span
                    :class="assetPctChange >= 0 ? 'text-emerald-600' : 'text-red-600'"
                    class="text-xs ml-1 font-bold">
                    {{ formatSignedPercent(assetPctChange) }}
                  </span>
                  </template>
                </TooltipContent>
              </Tooltip>
            </div>
            <table class="w-full text-sm">
              <tbody class="divide-y">
                <tr v-for="r in assetRows" :key="r.id" :class="isDisabled(r.id) ? 'opacity-40' : ''">
                  <td class="py-2 w-8">
                    <Button variant="ghost" size="icon" class="size-7" @click="toggleDisabled(r.id)">
                      <component :is="isDisabled(r.id) ? EyeOff : Eye" class="size-4" />
                    </Button>
                  </td>
                  <td class="py-2">{{ r.name }}</td>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <td class="py-2 text-right font-medium">
                        {{ formatCurrency(r.value) }}
                      </td>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span v-if="r.pctChange === null || r.pctChange === 0" class="text-xs font-semibold">
                        No Change
                      </span>
                      <template v-else>
                      <span class="text-xs font-semibold">
                        {{ formatCurrency(r.currentValue) }} → {{ formatCurrency(r.value) }}
                      </span>
                      <span
                        :class="r.pctChange >= 0 ? 'text-emerald-600' : 'text-red-600'"
                        class="text-xs ml-1 font-bold">
                        {{ formatSignedPercent(r.pctChange) }}
                      </span>
                      </template>
                    </TooltipContent>
                  </Tooltip>
                </tr>
                <tr v-if="assetRows.length === 0">
                  <td class="py-2 text-muted-foreground italic">No assets.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <div class="flex items-center justify-between text-xs uppercase text-muted-foreground mb-2">
              <span>Liabilities ({{ liabilityRows.length }})</span>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="font-semibold">
                    {{ formatCurrency(liabilitySum) }}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span v-if="liabilityPctChange === null || liabilityPctChange === 0" class="text-xs font-semibold">
                    No Change
                  </span>
                  <template v-else>
                  <span class="text-xs font-semibold">
                    {{ formatCurrency(liabilityCurrentSum) }} → {{ formatCurrency(liabilitySum) }}
                  </span>
                  <span
                    :class="liabilityPctChange >= 0 ? 'text-emerald-600' : 'text-red-600'"
                    class="text-xs ml-1 font-bold">
                    {{ formatSignedPercent(liabilityPctChange) }}
                  </span>
                  </template>
                </TooltipContent>
              </Tooltip>
            </div>
            <table class="w-full text-sm">
              <tbody class="divide-y">
                <tr v-for="r in liabilityRows" :key="r.id" :class="isDisabled(r.id) ? 'opacity-40' : ''">
                  <td class="py-2 w-8">
                    <Button variant="ghost" size="icon" class="size-7" @click="toggleDisabled(r.id)">
                      <component :is="isDisabled(r.id) ? EyeOff : Eye" class="size-4" />
                    </Button>
                  </td>
                  <td class="py-2">{{ r.name }}</td>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <td class="py-2 text-right font-medium">
                        {{ formatCurrency(r.value) }}
                      </td>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span v-if="r.pctChange === null || r.pctChange === 0" class="text-xs font-semibold">
                        No Change
                      </span>
                      <template v-else>
                      <span class="text-xs font-semibold">
                        {{ formatCurrency(r.currentValue) }} → {{ formatCurrency(r.value) }}
                      </span>
                      <span
                        :class="r.pctChange >= 0 ? 'text-emerald-600' : 'text-red-600'"
                        class="text-xs ml-1 font-bold">
                        {{ formatSignedPercent(r.pctChange) }}
                      </span>
                      </template>
                    </TooltipContent>
                  </Tooltip>
                </tr>
                <tr v-if="liabilityRows.length === 0">
                  <td class="py-2 text-muted-foreground italic">No liabilities.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </TooltipProvider>

      <!-- Net pos -->
      <div class="flex items-center justify-end mt-3">
        <Tooltip>
          <TooltipTrigger as-child>
            <div class="text-sm text-muted-foreground uppercase font-semibold">
              Net:
              <span>{{ formatCurrency(netWorthAtDisplay) }}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <span v-if="netPctChange === null || netPctChange === 0">
              No Change
            </span>
            <template v-else>
              <span class="text-xs font-semibold">
                {{ formatCurrency(netCurrent) }} → {{ formatCurrency(netWorthAtDisplay) }}
              </span>
              <span
                :class="netPctChange >= 0 ? 'text-emerald-600' : 'text-red-600'"
                class="text-xs ml-1 font-bold">
                {{ formatSignedPercent(netPctChange) }}
              </span>
            </template>
          </TooltipContent>
        </Tooltip>
      </div>

    </section>

    <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 bg-card rounded border">
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
                <Button variant="ghost" size="icon" class="size-7" @click="toggleDisabled(i.id)">
                  <component :is="isDisabled(i.id) ? EyeOff : Eye" class="size-4" />
                </Button>
              </td>
              <td class="py-2">
                <div class="font-medium">{{ i.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ i.type }} · {{ i.frequency?.kind ?? 'one-off' }}
                </div>
              </td>
              <td class="py-2 text-right font-medium">
                +{{ formatCurrency(i.amount) }}
              </td>
            </tr>
            <tr v-if="scenario.entities.incomes.length === 0">
              <td class="py-2 text-muted-foreground italic">No incomes.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="p-4 bg-card rounded border">
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
                <Button variant="ghost" size="icon" class="size-7" @click="toggleDisabled(e.id)">
                  <component :is="isDisabled(e.id) ? EyeOff : Eye" class="size-4" />
                </Button>
              </td>
              <td class="py-2">
                <div class="font-medium">{{ e.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ e.type }} · {{ e.frequency?.kind ?? 'one-off' }}
                </div>
              </td>
              <td class="py-2 text-right font-medium">
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

    <section v-if="scenario.entities.transfers.length > 0" class="p-4 bg-card rounded border">
      <div class="text-xs uppercase text-muted-foreground mb-2">
        Transfers ({{ scenario.entities.transfers.length }})
      </div>
      <table class="w-full text-sm">
        <tbody class="divide-y">
          <tr v-for="t in scenario.entities.transfers" :key="t.id" :class="isDisabled(t.id) ? 'opacity-40' : ''">
            <td class="py-2 w-8">
              <Button variant="ghost" size="icon" class="size-7" @click="toggleDisabled(t.id)">
                <component :is="isDisabled(t.id) ? EyeOff : Eye" class="size-4" />
              </Button>
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
