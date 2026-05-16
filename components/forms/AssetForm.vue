<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import FormRow from '@/components/forms/FormRow.vue'
import { assetSchema, type Asset, type AssetType } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import type { Liability } from '@/core/schemas/liability'
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

const save = () => {
  error.value = ''
  const existing = props.asset
  const snapshots = existing?.snapshots ?? []
  const hasSnapshot = snapshots.length > 0
  const candidate: Asset = {
    id: state.id,
    name: state.name.trim(),
    type: state.type,
    startDate: requireDateInput(state.startDate),
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

  const parsed = assetSchema.safeParse(candidate)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Invalid asset'
    return
  }
  emit('save', parsed.data)
}
</script>

<template>
  <form
    class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded border border-neutral-200"
    @submit.prevent="save"
  >
    <FormRow label="Name">
      <input v-model="state.name" required class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Type">
      <select v-model="state.type" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="t in assetTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </FormRow>
    <FormRow label="Start date">
      <input v-model="state.startDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="End date (optional)">
      <input v-model="state.endDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow v-if="!props.asset" label="Initial balance">
      <input v-model.number="state.initialBalance" type="number" step="0.01" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Growth type">
      <select v-model="state.growthType" class="border border-neutral-300 rounded px-2 py-1">
        <option value="simple">simple</option>
        <option value="compounding">compounding</option>
      </select>
    </FormRow>
    <FormRow label="Annual rate (e.g. 0.05 = 5%)">
      <input v-model.number="state.rate" type="number" step="0.0001" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow v-if="state.growthType === 'compounding'" label="Compounding frequency">
      <select v-model="state.compoundingFrequency" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
      </select>
    </FormRow>
    <FormRow v-if="state.type === 'account_offset'" label="Linked liability">
      <select v-model="state.linkedLiabilityId" class="border border-neutral-300 rounded px-2 py-1">
        <option value="">— none —</option>
        <option v-for="l in props.liabilities" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-red-600">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t border-neutral-200">
      <button
        v-if="props.asset"
        type="button"
        class="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
        @click="emit('delete', props.asset.id)"
      >
        Delete
      </button>
      <button type="button" class="px-3 py-1 rounded text-sm border border-neutral-300 hover:bg-neutral-100" @click="emit('cancel')">
        Cancel
      </button>
      <button type="submit" class="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700">
        Save
      </button>
    </div>
  </form>
</template>
