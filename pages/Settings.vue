<script setup lang="ts">
import { useColorMode, type BasicColorSchema } from '@vueuse/core'
import { ref } from 'vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import AppSelect from '@/components/forms/AppSelect.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useScenariosStore } from '@/stores/scenarios'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const scenarios = useScenariosStore()
const mode = useColorMode()

const themeOptions: { value: BasicColorSchema; label: string }[] = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const onTheme = (v: BasicColorSchema | '') => {
  if (v) mode.value = v
}

const resetOpen = ref(false)
const confirmReset = () => scenarios.reset()
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <h2 class="text-2xl font-semibold">Settings</h2>

    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1">
          <Label>Theme</Label>
          <AppSelect :model-value="mode" :options="themeOptions" @update:model-value="onTheme" />
        </div>
        <div class="space-y-1">
          <Label>Inflation rate</Label>
          <Input
            type="number"
            step="0.001"
            :value="settingsStore.settings.inflationRate"
            @input="settingsStore.setInflationRate(parseFloat(($event.target as HTMLInputElement).value))"
          />
        </div>
        <div class="space-y-1">
          <Label>Currency</Label>
          <div class="text-sm text-muted-foreground">{{ settingsStore.settings.currency }} (display only)</div>
        </div>
        <div class="space-y-1">
          <Label>Tax jurisdiction</Label>
          <div class="text-sm text-muted-foreground">
            {{ settingsStore.settings.taxConfig.jurisdiction }} —
            {{ settingsStore.settings.taxConfig.year }}
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <Button @click="scenarios.loadSampleData()">Load sample data</Button>
          <Button variant="outline" disabled>Export JSON</Button>
          <Button variant="outline" disabled>Import JSON</Button>
          <Button variant="destructive" @click="resetOpen = true">Reset all data</Button>
        </div>
      </CardContent>
    </Card>

    <ConfirmationDialog
      v-model:open="resetOpen"
      title="Reset all data?"
      description="This will delete all scenarios, entities, and snapshots. Cannot be undone."
      confirm-label="Reset"
      @confirm="confirmReset"
    />
  </div>
</template>
