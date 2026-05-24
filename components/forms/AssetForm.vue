<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import AppSelect from '@/components/forms/AppSelect.vue'
import FormRow from '@/components/forms/FormRow.vue'
import WarningChip from '@/components/WarningChip.vue'
import WarningsList from '@/components/WarningsList.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assetSchema, type Asset, type AssetType } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import type { Liability } from '@/core/schemas/liability'
import { checkAsset, type Warning } from '@/core/validation/warnings'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'

const props = defineProps<{
  asset?: Asset
  liabilities: Liability[]
}>()

const emit = defineEmits<{
  (e: 'save', asset: Asset): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const assetTypes: AssetType[] = [
  'account_cash',
  'account_savings',
  'account_offset',
  'account_investment',
  'property',
  'vehicle',
]

const frequencies: FrequencyKind[] = ['daily', 'weekly', 'fortnightly', 'monthly', 'annually']

const assetTypeOptions = assetTypes.map((t) => ({ value: t, label: t }))
const growthTypeOptions: { value: 'simple' | 'compounding'; label: string }[] = [
  { value: 'simple', label: 'simple' },
  { value: 'compounding', label: 'compounding' },
]
const frequencyOptions = frequencies.map((f) => ({ value: f, label: f }))
const linkedLiabilityOptions = computed(() =>
  props.liabilities.map((l) => ({ value: l.id, label: l.name })),
)

type FormState = {
  id: string
  name: string
  type: AssetType
  startDate: string
  endDate: string
  growthType: 'simple' | 'compounding'
  rate: number
  compoundingFrequency: FrequencyKind
  linkedLiabilityId: string
  initialBalance: number
}

const blank = (): FormState => ({
  id: uuidv7(),
  name: '',
  type: 'account_cash',
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
  growthType: 'simple',
  rate: 0,
  compoundingFrequency: 'monthly',
  linkedLiabilityId: '',
  initialBalance: 0,
})

const fromAsset = (a: Asset): FormState => ({
  id: a.id,
  name: a.name,
  type: a.type,
  startDate: toDateInput(a.startDate),
  endDate: toDateInput(a.endDate),
  growthType: a.growth.type,
  rate: a.growth.rate,
  compoundingFrequency: a.growth.compoundingFrequency?.kind ?? 'monthly',
  linkedLiabilityId: a.linkedLiabilityId ?? '',
  initialBalance: a.snapshots[a.snapshots.length - 1]?.value ?? 0,
})

const state = reactive<FormState>(props.asset ? fromAsset(props.asset) : blank())

watch(
  () => props.asset,
  (a) => {
    Object.assign(state, a ? fromAsset(a) : blank())
  },
)

const error = ref('')

const buildCandidate = (): Asset => {
  const existing = props.asset
  const snapshots = existing?.snapshots ?? []
  const hasSnapshot = snapshots.length > 0
  const candidate: Asset = {
    id: state.id,
    name: state.name.trim(),
    type: state.type,
    startDate: requireDateInput(state.startDate || new Date().toISOString()),
    snapshots: hasSnapshot
      ? snapshots
      : [{ date: new Date().toISOString(), value: Number(state.initialBalance), actual: true }],
    growth: {
      type: state.growthType,
      rate: Number(state.rate),
      ...(state.growthType === 'compounding'
        ? { compoundingFrequency: { kind: state.compoundingFrequency } }
        : {}),
    },
    tagIds: existing?.tagIds ?? [],
  }
  const end = fromDateInput(state.endDate)
  if (end) candidate.endDate = end
  if (state.linkedLiabilityId) candidate.linkedLiabilityId = state.linkedLiabilityId
  return candidate
}

const draftWarnings = computed<Warning[]>(() => {
  try {
    return checkAsset(buildCandidate())
  } catch {
    return []
  }
})
const warningsForField = (field: string) =>
  draftWarnings.value.filter((w) => w.field === field)

const save = () => {
  error.value = ''
  const candidate = buildCandidate()
  const parsed = assetSchema.safeParse(candidate)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid asset'
    error.value = msg
    toast.error(`Save failed: ${msg}`)
    return
  }
  emit('save', parsed.data)
}
</script>

<template>
  <form
    class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-md border"
    @submit.prevent="save"
  >
    <FormRow label="Name">
      <Input v-model="state.name" required />
    </FormRow>
    <FormRow label="Type">
      <AppSelect v-model="state.type" :options="assetTypeOptions" placeholder="Type" />
    </FormRow>
    <FormRow label="Start date">
      <Input v-model="state.startDate" type="date" />
    </FormRow>
    <FormRow label="End date (optional)">
      <Input v-model="state.endDate" type="date" />
    </FormRow>
    <FormRow v-if="!props.asset" label="Initial balance">
      <Input v-model.number="state.initialBalance" type="number" step="0.01" />
      <WarningChip
        v-for="w in warningsForField('snapshots.0.value')"
        :key="w.code"
        :warning="w"
      />
    </FormRow>
    <FormRow label="Growth type">
      <AppSelect v-model="state.growthType" :options="growthTypeOptions" />
    </FormRow>
    <FormRow label="Annual rate (e.g. 0.05 = 5%)">
      <Input v-model.number="state.rate" type="number" step="0.0001" />
    </FormRow>
    <FormRow v-if="state.growthType === 'compounding'" label="Compounding frequency">
      <AppSelect v-model="state.compoundingFrequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow v-if="state.type === 'account_offset'" label="Linked liability">
      <AppSelect
        v-model="state.linkedLiabilityId"
        :options="linkedLiabilityOptions"
        placeholder="— none —"
      />
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-destructive">{{ error }}</div>

    <div v-if="draftWarnings.length > 0" class="md:col-span-2 border-t pt-2">
      <WarningsList :warnings="draftWarnings" />
    </div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
      <Button
        v-if="props.asset"
        type="button"
        variant="destructive"
        size="sm"
        @click="emit('delete', props.asset.id)"
      >
        Delete
      </Button>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" size="sm">Save</Button>
    </div>
  </form>
</template>
