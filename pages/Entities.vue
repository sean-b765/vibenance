<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSelect from '@/components/forms/AppSelect.vue'
import AssetForm from '@/components/forms/AssetForm.vue'
import ExpenseForm from '@/components/forms/ExpenseForm.vue'
import IncomeForm from '@/components/forms/IncomeForm.vue'
import LiabilityForm from '@/components/forms/LiabilityForm.vue'
import MoveCloneBar from '@/components/forms/MoveCloneBar.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import type { Warning } from '@/core/validation/warnings'
import { useScenariosStore } from '@/stores/scenarios'
import { useWarningsStore } from '@/stores/warnings'
import { formatCurrency } from '@/utils/format'

const scenarios = useScenariosStore()
const warningsStore = useWarningsStore()
const route = useRoute()
const router = useRouter()

const warningsByEntity = computed<Record<string, Warning[]>>(() => {
  const out: Record<string, Warning[]> = {}
  for (const w of warningsStore.activeScenarioWarnings) {
    if (w.entityType === 'scenario') continue
    if (!out[w.entityId]) out[w.entityId] = []
    out[w.entityId]!.push(w)
  }
  return out
})
const warningsFor = (id: string): Warning[] => warningsByEntity.value[id] ?? []

const expandedId = ref<string | null>(null)

const applyQuery = () => {
  const q = route.query
  const scenarioQ = typeof q.scenario === 'string' ? q.scenario : null
  const expandQ = typeof q.expand === 'string' ? q.expand : null
  if (scenarioQ && scenarios.scenarios.some((s) => s.id === scenarioQ)) {
    scenarios.setActive(scenarioQ)
  }
  if (expandQ) {
    expandedId.value = expandQ
  }
  if (scenarioQ || expandQ) {
    router.replace({ name: 'entities', query: {} })
  }
}
onMounted(applyQuery)
watch(() => route.query, applyQuery)
const newCategory = ref<null | 'asset' | 'liability' | 'income' | 'expense'>(null)
const filter = ref('')

const scenario = computed(() => scenarios.activeScenario)
const scenarioId = computed(() => scenario.value?.id ?? null)

const filterText = computed(() => filter.value.trim().toLowerCase())
const matches = (name: string) =>
  !filterText.value || name.toLowerCase().includes(filterText.value)

const assets = computed(() => scenario.value?.entities.assets.filter((a) => matches(a.name)) ?? [])
const liabilities = computed(
  () => scenario.value?.entities.liabilities.filter((l) => matches(l.name)) ?? [],
)
const incomes = computed(() => scenario.value?.entities.incomes.filter((i) => matches(i.name)) ?? [])
const expenses = computed(() => scenario.value?.entities.expenses.filter((e) => matches(e.name)) ?? [])
const allAssets = computed(() => scenario.value?.entities.assets ?? [])
const allLiabilities = computed(() => scenario.value?.entities.liabilities ?? [])

const lastSnapshotValue = (snaps: { value: number }[]) =>
  snaps[snaps.length - 1]?.value ?? null

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
  newCategory.value = null
}

const openNew = (cat: typeof newCategory.value) => {
  newCategory.value = newCategory.value === cat ? null : cat
  expandedId.value = null
}

const saveAsset = (a: Asset) => {
  if (!scenarioId.value) return
  scenarios.upsertAsset(scenarioId.value, a)
  expandedId.value = null
  newCategory.value = null
}
const saveLiability = (l: Liability) => {
  if (!scenarioId.value) return
  scenarios.upsertLiability(scenarioId.value, l)
  expandedId.value = null
  newCategory.value = null
}
const saveIncome = (i: Income) => {
  if (!scenarioId.value) return
  scenarios.upsertIncome(scenarioId.value, i)
  expandedId.value = null
  newCategory.value = null
}
const saveExpense = (e: Expense) => {
  if (!scenarioId.value) return
  scenarios.upsertExpense(scenarioId.value, e)
  expandedId.value = null
  newCategory.value = null
}

const removeAsset = (id: string) => {
  if (!scenarioId.value) return
  scenarios.removeEntity(scenarioId.value, 'assets', id)
  expandedId.value = null
}
const removeLiability = (id: string) => {
  if (!scenarioId.value) return
  scenarios.removeEntity(scenarioId.value, 'liabilities', id)
  expandedId.value = null
}
const removeIncome = (id: string) => {
  if (!scenarioId.value) return
  scenarios.removeEntity(scenarioId.value, 'incomes', id)
  expandedId.value = null
}
const removeExpense = (id: string) => {
  if (!scenarioId.value) return
  scenarios.removeEntity(scenarioId.value, 'expenses', id)
  expandedId.value = null
}

const newSnapshotValue = ref('')
const snapshotTargetId = ref<string | null>(null)
const startSnapshot = (id: string) => {
  snapshotTargetId.value = snapshotTargetId.value === id ? null : id
  newSnapshotValue.value = ''
}
const submitSnapshot = (kind: 'assets' | 'liabilities', id: string) => {
  if (!scenarioId.value) return
  const v = Number(newSnapshotValue.value)
  if (!Number.isFinite(v)) return
  scenarios.appendSnapshot(scenarioId.value, kind, id, v)
  snapshotTargetId.value = null
  newSnapshotValue.value = ''
}
</script>

<template>
  <div v-if="!scenario" class="text-muted-foreground">
    No active scenario. Load sample data on the dashboard, or create one in /scenarios.
  </div>

  <div v-else class="space-y-8">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Entities</h2>
      </div>
      <div class="flex items-center gap-2">
        <div class="min-w-[220px]">
          <AppSelect :model-value="scenarioId ?? ''"
            :options="scenarios.scenarios.map((s) => ({ value: s.id, label: s.name, colour: s.colour }))"
            placeholder="Scenario" @update:model-value="(v) => v && scenarios.setActive(String(v))" />
        </div>
        <Input v-model="filter" placeholder="Filter by name" class="w-72" />
      </div>
    </header>

    <!-- Assets -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Assets ({{ assets.length }})</h3>
        <Button size="sm" variant="outline" @click="openNew('asset')">
          {{ newCategory === 'asset' ? 'Cancel' : '+ Add asset' }}
        </Button>
      </div>
      <div v-if="newCategory === 'asset'" class="mb-3">
        <AssetForm :liabilities="allLiabilities" @save="saveAsset" @cancel="newCategory = null" @delete="() => { }" />
      </div>
      <ul class="divide-y border border-border rounded bg-card">
        <li v-for="a in assets" :key="a.id">
          <Button variant="ghost" class="w-full justify-start gap-3 p-3 h-auto font-normal rounded-none"
            @click="toggleExpand(a.id)">
            <div class="flex-1 text-start">
              <span class="flex-1 font-medium text-start">{{ a.name }}</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ a.type }}</span>
            <span class="text-sm font-mono">{{ formatCurrency(lastSnapshotValue(a.snapshots) ?? 0) }}</span>
            <span class="text-muted-foreground">{{ expandedId === a.id ? '▾' : '▸' }}</span>
          </Button>
          <div v-if="expandedId === a.id && scenarioId" class="p-3 space-y-3 border-t border-border">
            <AssetForm :asset="a" :liabilities="allLiabilities" @save="saveAsset" @cancel="expandedId = null"
              @delete="removeAsset" />
            <MoveCloneBar :from-scenario-id="scenarioId" :entity-id="a.id" kind="assets" />
            <div class="flex items-center gap-2 p-3 bg-card rounded-md border">
              <span class="text-xs uppercase text-muted-foreground">Log balance update</span>
              <Input v-model="newSnapshotValue" type="number" step="0.01" placeholder="New balance" class="flex-1"
                @focus="startSnapshot(a.id)" />
              <Button size="sm" variant="outline" :disabled="snapshotTargetId !== a.id || newSnapshotValue === ''"
                @click="submitSnapshot('assets', a.id)">
                Append snapshot
              </Button>
            </div>
          </div>
        </li>
        <li v-if="assets.length === 0" class="p-3 text-sm text-muted-foreground italic">No assets.</li>
      </ul>
    </section>

    <!-- Liabilities -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Liabilities ({{ liabilities.length }})</h3>
        <Button size="sm" variant="outline" @click="openNew('liability')">
          {{ newCategory === 'liability' ? 'Cancel' : '+ Add liability' }}
        </Button>
      </div>
      <div v-if="newCategory === 'liability'" class="mb-3">
        <LiabilityForm :assets="allAssets" @save="saveLiability" @cancel="newCategory = null" @delete="() => { }" />
      </div>
      <ul class="divide-y border border-border rounded bg-card">
        <li v-for="l in liabilities" :key="l.id">
          <Button variant="ghost" class="w-full justify-start gap-3 p-3 h-auto font-normal rounded-none"
            @click="toggleExpand(l.id)">
            <div class="flex-1 text-start">
              <span class="flex-1 font-medium text-start">{{ l.name }}</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ l.type }}</span>
            <span class="text-sm font-mono">
              {{ formatCurrency(lastSnapshotValue(l.snapshots) ?? 0) }}
            </span>
            <span class="text-muted-foreground">{{ expandedId === l.id ? '▾' : '▸' }}</span>
          </Button>
          <div v-if="expandedId === l.id && scenarioId" class="p-3 space-y-3 border-t border-border">
            <LiabilityForm :liability="l" :assets="allAssets" @save="saveLiability" @cancel="expandedId = null"
              @delete="removeLiability" />
            <MoveCloneBar :from-scenario-id="scenarioId" :entity-id="l.id" kind="liabilities" />
            <div class="flex items-center gap-2 p-3 bg-card rounded-md border">
              <span class="text-xs uppercase text-muted-foreground">Log balance update</span>
              <Input v-model="newSnapshotValue" type="number" step="0.01" placeholder="New balance" class="flex-1"
                @focus="startSnapshot(l.id)" />
              <Button size="sm" variant="outline" :disabled="snapshotTargetId !== l.id || newSnapshotValue === ''"
                @click="submitSnapshot('liabilities', l.id)">
                Append snapshot
              </Button>
            </div>
          </div>
        </li>
        <li v-if="liabilities.length === 0" class="p-3 text-sm text-muted-foreground italic">No liabilities.</li>
      </ul>
    </section>

    <!-- Incomes -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Incomes ({{ incomes.length }})</h3>
        <Button size="sm" variant="outline" @click="openNew('income')">
          {{ newCategory === 'income' ? 'Cancel' : '+ Add income' }}
        </Button>
      </div>
      <div v-if="newCategory === 'income'" class="mb-3">
        <IncomeForm :assets="allAssets" @save="saveIncome" @cancel="newCategory = null" @delete="() => { }" />
      </div>
      <ul class="divide-y border border-border rounded bg-card">
        <li v-for="i in incomes" :key="i.id">
          <Button variant="ghost" class="w-full justify-start gap-3 p-3 h-auto font-normal rounded-none"
            @click="toggleExpand(i.id)">
            <div class="flex-1 text-start">
              <span class="flex-1 font-medium text-start">{{ i.name }}</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ i.type }} · {{ i.frequency?.kind ?? 'one-off' }}</span>
            <span class="text-sm font-mono">{{ formatCurrency(i.amount) }}</span>
            <span class="text-muted-foreground">{{ expandedId === i.id ? '▾' : '▸' }}</span>
          </Button>
          <div v-if="expandedId === i.id && scenarioId" class="p-3 space-y-3 border-t border-border">
            <IncomeForm :income="i" :assets="allAssets" @save="saveIncome" @cancel="expandedId = null"
              @delete="removeIncome" />
            <MoveCloneBar :from-scenario-id="scenarioId" :entity-id="i.id" kind="incomes" />
          </div>
        </li>
        <li v-if="incomes.length === 0" class="p-3 text-sm text-muted-foreground italic">No incomes.</li>
      </ul>
    </section>

    <!-- Expenses -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Expenses ({{ expenses.length }})</h3>
        <Button size="sm" variant="outline" @click="openNew('expense')">
          {{ newCategory === 'expense' ? 'Cancel' : '+ Add expense' }}
        </Button>
      </div>
      <div v-if="newCategory === 'expense'" class="mb-3">
        <ExpenseForm :assets="allAssets" @save="saveExpense" @cancel="newCategory = null" @delete="() => { }" />
      </div>
      <ul class="divide-y border border-border rounded bg-card">
        <li v-for="e in expenses" :key="e.id">
          <Button variant="ghost" class="w-full justify-start gap-3 p-3 h-auto font-normal rounded-none"
            @click="toggleExpand(e.id)">
            <div class="flex-1 text-start">
              <span class="flex-1 font-medium text-start">{{ e.name }}</span>
            </div>
            <span class="text-xs text-muted-foreground">{{ e.type }} · {{ e.frequency?.kind ?? 'one-off' }}</span>
            <span class="text-sm font-mono">{{ formatCurrency(e.amount) }}</span>
            <span class="text-muted-foreground">{{ expandedId === e.id ? '▾' : '▸' }}</span>
          </Button>
          <div v-if="expandedId === e.id && scenarioId" class="p-3 space-y-3 border-t border-border">
            <ExpenseForm :expense="e" :assets="allAssets" @save="saveExpense" @cancel="expandedId = null"
              @delete="removeExpense" />
            <MoveCloneBar :from-scenario-id="scenarioId" :entity-id="e.id" kind="expenses" />
          </div>
        </li>
        <li v-if="expenses.length === 0" class="p-3 text-sm text-muted-foreground italic">No expenses.</li>
      </ul>
    </section>
  </div>
</template>
