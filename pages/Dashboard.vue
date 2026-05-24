<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import NetWorthChart from '@/components/NetWorthChart.vue'
import WarningsList from '@/components/WarningsList.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { compute as computeNetWorth } from '@/core/engine/netWorth'
import { simulate } from '@/core/engine/simulation'
import { parseBundle } from '@/core/io/json'
import type { Warning } from '@/core/validation/warnings'
import { useScenariosStore } from '@/stores/scenarios'
import { useSettingsStore } from '@/stores/settings'
import { useTagsStore } from '@/stores/tags'
import { useWarningsStore } from '@/stores/warnings'
import { formatCurrency } from '@/utils/format'
import { warningRoute } from '@/utils/warningRoute'

const scenarios = useScenariosStore()
const tags = useTagsStore()
const settings = useSettingsStore()
const warnings = useWarningsStore()
const router = useRouter()
const today = new Date().toISOString()

const goToWarning = (scenarioId: string, w: Warning) => {
  router.push(warningRoute(scenarioId, w))
}

const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)

const triggerImport = () => {
  importError.value = null
  fileInput.value?.click()
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const bundle = parseBundle(await file.text())
    scenarios.replaceAll(bundle.scenarios)
    tags.replaceAll(bundle.tags)
    settings.replaceAll(bundle.settings)
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Import failed'
  }
}

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
    <p class="text-muted-foreground mb-6">Get started by loading sample data or importing JSON.</p>
    <div class="flex gap-3 justify-center">
      <Button @click="scenarios.loadSampleData()">Try with sample data</Button>
      <Button variant="outline" @click="triggerImport">Import JSON</Button>
      <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFileChange" />
    </div>
    <div v-if="importError" class="mt-3 text-sm text-destructive">{{ importError }}</div>
  </div>

  <div v-else class="space-y-6">
    <header>
      <h2 class="text-2xl font-semibold">Dashboard</h2>
      <p class="text-sm text-muted-foreground">
        Active scenario: {{ scenarios.activeScenario?.name }}
      </p>
    </header>

    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs uppercase text-muted-foreground font-medium">Net worth</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-semibold">{{ formatCurrency(netWorth) }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs uppercase text-muted-foreground font-medium">Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold text-emerald-600">{{ formatCurrency(assetTotal) }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-xs uppercase text-muted-foreground font-medium">Liabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold text-red-600">{{ formatCurrency(liabilityTotal) }}</div>
        </CardContent>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>Favourite scenarios (5y)</CardTitle>
      </CardHeader>
      <CardContent>
        <NetWorthChart
          v-if="favouriteLines.length > 0"
          :lines="favouriteLines"
          bucket-kind="month"
          height="300px"
        />
        <p v-else class="text-sm text-muted-foreground">No favourites yet.</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Warnings</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          v-if="warnings.favouriteWarnings.every((g) => g.warnings.length === 0)"
          class="text-sm text-muted-foreground"
        >
          No warnings.
        </p>
        <div v-else class="space-y-4">
          <div v-for="group in warnings.favouriteWarnings" :key="group.scenario.id">
            <div
              v-if="group.warnings.length > 0"
              class="text-xs uppercase text-muted-foreground font-medium mb-1"
            >
              {{ group.scenario.name }} — {{ group.warnings.length }}
              {{ group.warnings.length === 1 ? 'warning' : 'warnings' }}
            </div>
            <WarningsList
              v-if="group.warnings.length > 0"
              :warnings="group.warnings"
              @select="(w) => goToWarning(group.scenario.id, w)"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
