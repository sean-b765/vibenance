import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import auTax from '@/config/tax/au-2026.json'
import { loadKv, saveKv } from '@/core/db'
import type { Settings } from '@/core/schemas/settings'

const defaultSettings = (): Settings => ({
  currency: 'AUD',
  inflationRate: 0.025,
  taxConfig: auTax as Settings['taxConfig'],
})

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(defaultSettings())

  const setInflationRate = (rate: number) => {
    settings.value.inflationRate = rate
  }
  const reset = () => {
    settings.value = defaultSettings()
  }

  let persistenceEnabled = false
  const enablePersistence = async () => {
    if (persistenceEnabled) return
    persistenceEnabled = true
    const stored = await loadKv<Settings>('settings')
    if (stored) settings.value = stored
    watch(
      settings,
      (v) => {
        void saveKv('settings', JSON.parse(JSON.stringify(v)))
      },
      { deep: true },
    )
  }

  const replaceAll = (next: Settings) => {
    settings.value = next
  }

  return { settings, setInflationRate, reset, replaceAll, enablePersistence }
})
