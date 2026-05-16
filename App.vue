<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { setActiveCurrency } from '@/utils/format'

useColorMode()

const settings = useSettingsStore()
setActiveCurrency(settings.settings.currency)
watch(
  () => settings.settings.currency,
  (c) => setActiveCurrency(c),
)
</script>

<template>
  <RouterView />
</template>
