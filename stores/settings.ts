import { defineStore } from 'pinia'
import { ref } from 'vue'
import auTax from '@/config/tax/au-2026.json'
import type { Settings, ThemePreference } from '@/core/schemas/settings'

const defaultSettings = (): Settings => ({
  currency: 'AUD',
  inflationRate: 0.025,
  taxConfig: auTax as Settings['taxConfig'],
  theme: 'system',
})

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(defaultSettings())

  const setTheme = (theme: ThemePreference) => {
    settings.value.theme = theme
  }
  const setInflationRate = (rate: number) => {
    settings.value.inflationRate = rate
  }
  const reset = () => {
    settings.value = defaultSettings()
  }

  return { settings, setTheme, setInflationRate, reset }
})
