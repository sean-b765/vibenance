<script setup lang="ts">
import { useScenariosStore } from '@/stores/scenarios'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const scenarios = useScenariosStore()
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <h2 class="text-2xl font-semibold">Settings</h2>

    <section class="p-6 bg-white rounded border border-neutral-200 space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Theme</label>
        <select
          :value="settingsStore.settings.theme"
          class="px-3 py-2 border border-neutral-300 rounded text-sm w-full"
          @change="settingsStore.setTheme(($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Inflation rate</label>
        <input
          type="number"
          step="0.001"
          :value="settingsStore.settings.inflationRate"
          class="px-3 py-2 border border-neutral-300 rounded text-sm w-full"
          @input="settingsStore.setInflationRate(parseFloat(($event.target as HTMLInputElement).value))"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Currency</label>
        <div class="text-sm text-neutral-600">{{ settingsStore.settings.currency }} (display only)</div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Tax jurisdiction</label>
        <div class="text-sm text-neutral-600">
          {{ settingsStore.settings.taxConfig.jurisdiction }} —
          {{ settingsStore.settings.taxConfig.year }}
        </div>
      </div>
    </section>

    <section class="p-6 bg-white rounded border border-neutral-200 space-y-3">
      <h3 class="font-medium">Data</h3>
      <div class="flex flex-wrap gap-2">
        <button
          class="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          @click="scenarios.loadSampleData()"
        >
          Load sample data
        </button>
        <button
          class="px-4 py-2 rounded border border-neutral-300 text-sm hover:bg-neutral-100"
          disabled
        >
          Export JSON
        </button>
        <button
          class="px-4 py-2 rounded border border-neutral-300 text-sm hover:bg-neutral-100"
          disabled
        >
          Import JSON
        </button>
        <button
          class="px-4 py-2 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50"
          @click="scenarios.reset()"
        >
          Reset all data
        </button>
      </div>
    </section>
  </div>
</template>
