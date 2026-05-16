<script setup lang="ts">
import { computed, ref } from 'vue'
import AssetForm from '@/components/forms/AssetForm.vue'
import ExpenseForm from '@/components/forms/ExpenseForm.vue'
import IncomeForm from '@/components/forms/IncomeForm.vue'
import LiabilityForm from '@/components/forms/LiabilityForm.vue'
import type { Asset } from '@/core/schemas/asset'
import type { Expense } from '@/core/schemas/expense'
import type { Income } from '@/core/schemas/income'
import type { Liability } from '@/core/schemas/liability'
import { useScenariosStore } from '@/stores/scenarios'
import { formatCurrency } from '@/utils/format'

const scenarios = useScenariosStore()

const expandedId = ref<string | null>(null)
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
  <div v-if="!scenario" class="text-neutral-500">
    No active scenario. Load sample data on the dashboard, or create one in /scenarios.
  </div>

  <div v-else class="space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold">Entities</h2>
        <p class="text-xs text-neutral-500">Scenario: {{ scenario.name }}</p>
      </div>
      <input
        v-model="filter"
        placeholder="Filter by name"
        class="px-3 py-2 border border-neutral-300 rounded text-sm w-72"
      />
    </header>

    <!-- Assets -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Assets ({{ assets.length }})</h3>
        <button
          class="px-3 py-1 text-sm rounded border border-neutral-300 hover:bg-neutral-100"
          @click="openNew('asset')"
        >
          {{ newCategory === 'asset' ? 'Cancel' : '+ Add asset' }}
        </button>
      </div>
      <div v-if="newCategory === 'asset'" class="mb-3">
        <AssetForm
          :liabilities="allLiabilities"
          @save="saveAsset"
          @cancel="newCategory = null"
          @delete="() => {}"
        />
      </div>
      <ul class="divide-y border border-neutral-200 rounded bg-white">
        <li v-for="a in assets" :key="a.id">
          <button
            class="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50"
            @click="toggleExpand(a.id)"
          >
            <span class="flex-1 font-medium">{{ a.name }}</span>
            <span class="text-xs text-neutral-500">{{ a.type }}</span>
            <span class="text-sm font-mono">{{ formatCurrency(lastSnapshotValue(a.snapshots) ?? 0) }}</span>
            <span class="text-neutral-400">{{ expandedId === a.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="expandedId === a.id" class="p-3 space-y-3 border-t border-neutral-200">
            <AssetForm
              :asset="a"
              :liabilities="allLiabilities"
              @save="saveAsset"
              @cancel="expandedId = null"
              @delete="removeAsset"
            />
            <div class="flex items-center gap-2 p-3 bg-white rounded border border-neutral-200">
              <span class="text-xs uppercase text-neutral-500">Log balance update</span>
              <input
                v-model="newSnapshotValue"
                type="number"
                step="0.01"
                placeholder="New balance"
                class="border border-neutral-300 rounded px-2 py-1 text-sm flex-1"
                @focus="startSnapshot(a.id)"
              />
              <button
                class="px-2 py-1 rounded text-xs border border-neutral-300 hover:bg-neutral-100"
                :disabled="snapshotTargetId !== a.id || newSnapshotValue === ''"
                @click="submitSnapshot('assets', a.id)"
              >
                Append snapshot
              </button>
            </div>
          </div>
        </li>
        <li v-if="assets.length === 0" class="p-3 text-sm text-neutral-500 italic">No assets.</li>
      </ul>
    </section>

    <!-- Liabilities -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Liabilities ({{ liabilities.length }})</h3>
        <button
          class="px-3 py-1 text-sm rounded border border-neutral-300 hover:bg-neutral-100"
          @click="openNew('liability')"
        >
          {{ newCategory === 'liability' ? 'Cancel' : '+ Add liability' }}
        </button>
      </div>
      <div v-if="newCategory === 'liability'" class="mb-3">
        <LiabilityForm
          :assets="allAssets"
          @save="saveLiability"
          @cancel="newCategory = null"
          @delete="() => {}"
        />
      </div>
      <ul class="divide-y border border-neutral-200 rounded bg-white">
        <li v-for="l in liabilities" :key="l.id">
          <button
            class="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50"
            @click="toggleExpand(l.id)"
          >
            <span class="flex-1 font-medium">{{ l.name }}</span>
            <span class="text-xs text-neutral-500">{{ l.type }}</span>
            <span class="text-sm font-mono text-red-600">{{ formatCurrency(lastSnapshotValue(l.snapshots) ?? 0) }}</span>
            <span class="text-neutral-400">{{ expandedId === l.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="expandedId === l.id" class="p-3 space-y-3 border-t border-neutral-200">
            <LiabilityForm
              :liability="l"
              :assets="allAssets"
              @save="saveLiability"
              @cancel="expandedId = null"
              @delete="removeLiability"
            />
            <div class="flex items-center gap-2 p-3 bg-white rounded border border-neutral-200">
              <span class="text-xs uppercase text-neutral-500">Log balance update</span>
              <input
                v-model="newSnapshotValue"
                type="number"
                step="0.01"
                placeholder="New balance"
                class="border border-neutral-300 rounded px-2 py-1 text-sm flex-1"
                @focus="startSnapshot(l.id)"
              />
              <button
                class="px-2 py-1 rounded text-xs border border-neutral-300 hover:bg-neutral-100"
                :disabled="snapshotTargetId !== l.id || newSnapshotValue === ''"
                @click="submitSnapshot('liabilities', l.id)"
              >
                Append snapshot
              </button>
            </div>
          </div>
        </li>
        <li v-if="liabilities.length === 0" class="p-3 text-sm text-neutral-500 italic">No liabilities.</li>
      </ul>
    </section>

    <!-- Incomes -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Incomes ({{ incomes.length }})</h3>
        <button
          class="px-3 py-1 text-sm rounded border border-neutral-300 hover:bg-neutral-100"
          @click="openNew('income')"
        >
          {{ newCategory === 'income' ? 'Cancel' : '+ Add income' }}
        </button>
      </div>
      <div v-if="newCategory === 'income'" class="mb-3">
        <IncomeForm
          :assets="allAssets"
          @save="saveIncome"
          @cancel="newCategory = null"
          @delete="() => {}"
        />
      </div>
      <ul class="divide-y border border-neutral-200 rounded bg-white">
        <li v-for="i in incomes" :key="i.id">
          <button
            class="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50"
            @click="toggleExpand(i.id)"
          >
            <span class="flex-1 font-medium">{{ i.name }}</span>
            <span class="text-xs text-neutral-500">{{ i.type }} · {{ i.frequency?.kind ?? 'one-off' }}</span>
            <span class="text-sm font-mono">{{ formatCurrency(i.amount) }}</span>
            <span class="text-neutral-400">{{ expandedId === i.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="expandedId === i.id" class="p-3 border-t border-neutral-200">
            <IncomeForm
              :income="i"
              :assets="allAssets"
              @save="saveIncome"
              @cancel="expandedId = null"
              @delete="removeIncome"
            />
          </div>
        </li>
        <li v-if="incomes.length === 0" class="p-3 text-sm text-neutral-500 italic">No incomes.</li>
      </ul>
    </section>

    <!-- Expenses -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-medium">Expenses ({{ expenses.length }})</h3>
        <button
          class="px-3 py-1 text-sm rounded border border-neutral-300 hover:bg-neutral-100"
          @click="openNew('expense')"
        >
          {{ newCategory === 'expense' ? 'Cancel' : '+ Add expense' }}
        </button>
      </div>
      <div v-if="newCategory === 'expense'" class="mb-3">
        <ExpenseForm
          :assets="allAssets"
          @save="saveExpense"
          @cancel="newCategory = null"
          @delete="() => {}"
        />
      </div>
      <ul class="divide-y border border-neutral-200 rounded bg-white">
        <li v-for="e in expenses" :key="e.id">
          <button
            class="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50"
            @click="toggleExpand(e.id)"
          >
            <span class="flex-1 font-medium">{{ e.name }}</span>
            <span class="text-xs text-neutral-500">{{ e.type }} · {{ e.frequency?.kind ?? 'one-off' }}</span>
            <span class="text-sm font-mono text-red-600">{{ formatCurrency(e.amount) }}</span>
            <span class="text-neutral-400">{{ expandedId === e.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="expandedId === e.id" class="p-3 border-t border-neutral-200">
            <ExpenseForm
              :expense="e"
              :assets="allAssets"
              @save="saveExpense"
              @cancel="expandedId = null"
              @delete="removeExpense"
            />
          </div>
        </li>
        <li v-if="expenses.length === 0" class="p-3 text-sm text-neutral-500 italic">No expenses.</li>
      </ul>
    </section>
  </div>
</template>
