<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle } from 'lucide-vue-next'
import WarningsList from '@/components/WarningsList.vue'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { Warning } from '@/core/validation/warnings'
import { useScenariosStore } from '@/stores/scenarios'
import { useWarningsStore } from '@/stores/warnings'
import { entityRoute } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const scenarios = useScenariosStore()
const warningsStore = useWarningsStore()

type Group = { scenarioId: string; scenarioName: string; warnings: Warning[] }

const groups = computed<Group[]>(() => {
  const name = route.name
  if (name === 'dashboard') {
    return warningsStore.favouriteWarnings
      .filter((g) => g.warnings.length > 0)
      .map((g) => ({ scenarioId: g.scenario.id, scenarioName: g.scenario.name, warnings: g.warnings }))
  }
  if (name === 'scenarios') {
    return Object.entries(warningsStore.warningsByScenario)
      .map(([k, g]) => {
        const scenarioName = scenarios.scenarios.find(s => s.id === k)?.name ?? 'Scenario'
        return { scenarioId: k, scenarioName, warnings: g }
      })
  }
  if (name === 'scenario-detail') {
    const id = route.params.id as string | undefined
    if (!id) return []
    const ws = warningsStore.warningsByScenario[id] ?? []
    if (ws.length === 0) return []
    const s = scenarios.scenarios.find((s) => s.id === id)
    return [{ scenarioId: id, scenarioName: s?.name ?? 'Scenario', warnings: ws }]
  }
  if (name === 'entities') {
    const active = scenarios.activeScenario
    if (!active) return []
    const ws = warningsStore.activeScenarioWarnings
    if (ws.length === 0) return []
    return [{ scenarioId: active.id, scenarioName: active.name, warnings: ws }]
  }
  return []
})

const totalCount = computed(() => groups.value.reduce((n, g) => n + g.warnings.length, 0))

const onSelect = (scenarioId: string, w: Warning) => {
  router.push(entityRoute(scenarioId, w))
}
</script>

<template>
  <Drawer v-if="totalCount > 0">
    <DrawerTrigger as-child>
      <Button
        class="fixed bottom-6 right-6 z-50 gap-2 rounded-full shadow-lg bg-orange-500/10 hover:bg-orange-600/10 backdrop-blur-lg border border-orange-600/30 text-white"
      >
        <AlertTriangle class="size-4" />
        {{ totalCount }} {{ totalCount === 1 ? 'warning' : 'warnings' }}
      </Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Warnings ({{ totalCount }})</DrawerTitle>
      </DrawerHeader>
      <div class="px-4 pb-4 space-y-4 overflow-y-auto">
        <template v-if="groups.length === 1">
          <DrawerClose as-child>
            <WarningsList
              :warnings="groups[0]!.warnings"
              @select="(w) => onSelect(groups[0]!.scenarioId, w)"
            />
          </DrawerClose>
        </template>
        <template v-else>
          <div v-for="g in groups" :key="g.scenarioId">
            <div class="text-xs uppercase text-muted-foreground font-medium mb-1">
              {{ g.scenarioName }} — {{ g.warnings.length }}
              {{ g.warnings.length === 1 ? 'warning' : 'warnings' }}
            </div>
            <DrawerClose as-child>
              <WarningsList :warnings="g.warnings" @select="(w) => onSelect(g.scenarioId, w)" />
            </DrawerClose>
          </div>
        </template>
      </div>
    </DrawerContent>
  </Drawer>
</template>
