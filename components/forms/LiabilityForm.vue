<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import FormRow from '@/components/forms/FormRow.vue'
import type { Asset } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import { liabilitySchema, type Liability, type LiabilityType } from '@/core/schemas/liability'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'

const props = defineProps<{
  liability?: Liability
  assets: Asset[]
}>()

const emit = defineEmits<{
  (e: 'save', liability: Liability): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const liabilityTypes: LiabilityType[] = ['mortgage', 'personal_loan', 'credit_card', 'car_loan']
const frequencies: FrequencyKind[] = ['daily', 'weekly', 'fortnightly', 'monthly', 'annually']

type FormState = {
  id: string
  name: string
  type: LiabilityType
  startDate: string
  endDate: string
  growthType: 'simple' | 'compounding'
  rate: number
  compoundingFrequency: FrequencyKind
  repayment: number
  paymentFrequency: FrequencyKind
  sourceAccountId: string
  creditCardGracePeriodDays: number
  creditCardRevolving: boolean
  initialBalance: number
}

const blank = (): FormState => ({
  id: uuidv7(),
  name: '',
  type: 'mortgage',
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
  growthType: 'compounding',
  rate: 0.06,
  compoundingFrequency: 'monthly',
  repayment: 0,
  paymentFrequency: 'monthly',
  sourceAccountId: '',
  creditCardGracePeriodDays: 55,
  creditCardRevolving: false,
  initialBalance: 0,
})

const fromLiability = (l: Liability): FormState => ({
  id: l.id,
  name: l.name,
  type: l.type,
  startDate: toDateInput(l.startDate),
  endDate: toDateInput(l.endDate),
  growthType: l.interest.type,
  rate: l.interest.rate,
  compoundingFrequency: l.interest.compoundingFrequency?.kind ?? 'monthly',
  repayment: l.repayment,
  paymentFrequency: l.paymentFrequency.kind,
  sourceAccountId: l.sourceAccountId,
  creditCardGracePeriodDays: l.creditCardGracePeriodDays ?? 55,
  creditCardRevolving: l.creditCardRevolving ?? false,
  initialBalance: l.snapshots[l.snapshots.length - 1]?.value ?? 0,
})

const state = reactive<FormState>(props.liability ? fromLiability(props.liability) : blank())
watch(
  () => props.liability,
  (l) => Object.assign(state, l ? fromLiability(l) : blank()),
)

const error = ref('')

const save = () => {
  error.value = ''
  const existing = props.liability
  const snapshots = existing?.snapshots ?? []
  const candidate: Liability = {
    id: state.id,
    name: state.name.trim(),
    type: state.type,
    startDate: requireDateInput(state.startDate),
    snapshots:
      snapshots.length > 0
        ? snapshots
        : [{ date: new Date().toISOString(), value: Number(state.initialBalance), actual: true }],
    interest: {
      type: state.growthType,
      rate: Number(state.rate),
      ...(state.growthType === 'compounding'
        ? { compoundingFrequency: { kind: state.compoundingFrequency } }
        : {}),
    },
    repayment: Number(state.repayment),
    paymentFrequency: { kind: state.paymentFrequency },
    sourceAccountId: state.sourceAccountId,
    tagIds: existing?.tagIds ?? [],
  }
  const end = fromDateInput(state.endDate)
  if (end) candidate.endDate = end
  if (state.type === 'credit_card') {
    candidate.creditCardGracePeriodDays = Number(state.creditCardGracePeriodDays)
    candidate.creditCardRevolving = state.creditCardRevolving
  }

  const parsed = liabilitySchema.safeParse(candidate)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Invalid liability'
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
        <option v-for="t in liabilityTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </FormRow>
    <FormRow label="Start date">
      <input v-model="state.startDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="End date (optional)">
      <input v-model="state.endDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow v-if="!props.liability" label="Initial balance">
      <input v-model.number="state.initialBalance" type="number" step="0.01" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Interest type">
      <select v-model="state.growthType" class="border border-neutral-300 rounded px-2 py-1">
        <option value="simple">simple</option>
        <option value="compounding">compounding</option>
      </select>
    </FormRow>
    <FormRow label="Annual rate">
      <input v-model.number="state.rate" type="number" step="0.0001" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow v-if="state.growthType === 'compounding'" label="Compounding frequency">
      <select v-model="state.compoundingFrequency" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
      </select>
    </FormRow>
    <FormRow label="Repayment amount">
      <input v-model.number="state.repayment" type="number" step="0.01" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Repayment frequency">
      <select v-model="state.paymentFrequency" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
      </select>
    </FormRow>
    <FormRow label="Source account">
      <select v-model="state.sourceAccountId" required class="border border-neutral-300 rounded px-2 py-1">
        <option value="">— select —</option>
        <option v-for="a in props.assets" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </FormRow>
    <template v-if="state.type === 'credit_card'">
      <FormRow label="Grace period (days)">
        <input v-model.number="state.creditCardGracePeriodDays" type="number" min="0" class="border border-neutral-300 rounded px-2 py-1" />
      </FormRow>
      <FormRow label="Revolving">
        <input v-model="state.creditCardRevolving" type="checkbox" class="self-start" />
      </FormRow>
    </template>

    <div v-if="error" class="md:col-span-2 text-sm text-red-600">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t border-neutral-200">
      <button
        v-if="props.liability"
        type="button"
        class="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
        @click="emit('delete', props.liability.id)"
      >
        Delete
      </button>
      <button type="button" class="px-3 py-1 rounded text-sm border border-neutral-300 hover:bg-neutral-100" @click="emit('cancel')">
        Cancel
      </button>
      <button type="submit" class="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700">Save</button>
    </div>
  </form>
</template>
