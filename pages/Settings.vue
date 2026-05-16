<script setup lang="ts">
import { useColorMode, type BasicColorSchema } from '@vueuse/core'
import { ref } from 'vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'
import AppSelect from '@/components/forms/AppSelect.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES } from '@/core/i18n/currency'
import { parseBundle, serializeBundle } from '@/core/io/json'
import { useScenariosStore } from '@/stores/scenarios'
import { useSettingsStore } from '@/stores/settings'
import { useTagsStore } from '@/stores/tags'

const settingsStore = useSettingsStore()
const scenarios = useScenariosStore()
const tags = useTagsStore()
const mode = useColorMode()

const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)

const doExport = () => {
	const text = serializeBundle({
		scenarios: scenarios.scenarios,
		tags: tags.tags,
		settings: settingsStore.settings,
	})
	const blob = new Blob([text], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `pfm-export-${new Date().toISOString().slice(0, 10)}.json`
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

const triggerImport = () => {
	importError.value = null
	importSuccess.value = null
	fileInput.value?.click()
}

const onFileChange = async (event: Event) => {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	input.value = ''
	if (!file) return
	try {
		const text = await file.text()
		const bundle = parseBundle(text)
		scenarios.replaceAll(bundle.scenarios)
		tags.replaceAll(bundle.tags)
		settingsStore.replaceAll(bundle.settings)
		importSuccess.value = `Imported ${bundle.scenarios.length} scenarios, ${bundle.tags.length} tags.`
	} catch (e) {
		importError.value = e instanceof Error ? e.message : 'Import failed'
	}
}

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
					<AppSelect
						:model-value="mode"
						:options="themeOptions"
						@update:model-value="onTheme"
					/>
				</div>
				<div class="space-y-1">
					<Label>Inflation rate</Label>
					<Input
						type="number"
						step="0.001"
						:value="settingsStore.settings.inflationRate"
						@input="
							settingsStore.setInflationRate(
								parseFloat(($event.target as HTMLInputElement).value),
							)
						"
					/>
				</div>
				<div class="space-y-1">
					<Label>Display Currency</Label>
					<AppSelect
						:model-value="settingsStore.settings.currency"
						:options="
							CURRENCIES.map((c) => ({ value: c.code, label: c.label }))
						"
						@update:model-value="
							(v) => v && settingsStore.setCurrency(String(v))
						"
					/>
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
					<Button variant="outline" @click="doExport">Export JSON</Button>
					<Button variant="outline" @click="triggerImport">Import JSON</Button>
					<Button variant="destructive" @click="resetOpen = true"
						>Reset all data</Button
					>
					<input
						ref="fileInput"
						type="file"
						accept="application/json,.json"
						class="hidden"
						@change="onFileChange"
					/>
				</div>
				<div v-if="importError" class="mt-3 text-sm text-destructive">
					{{ importError }}
				</div>
				<div v-if="importSuccess" class="mt-3 text-sm text-emerald-600">
					{{ importSuccess }}
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
