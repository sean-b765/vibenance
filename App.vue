<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { watch } from 'vue'
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
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
  <Toaster />
</template>
