<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import AppSelect from '@/components/forms/AppSelect.vue'
import FormRow from '@/components/forms/FormRow.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const liabilityTypeOptions = liabilityTypes.map((t) => ({ value: t, label: t }))
const growthTypeOptions: { value: 'simple' | 'compounding'; label: string }[] = [
  { value: 'simple', label: 'simple' },
  { value: 'compounding', label: 'compounding' },
]
const frequencyOptions = frequencies.map((f) => ({ value: f, label: f }))
const assetOptions = computed(() => props.assets.map((a) => ({ value: a.id, label: a.name })))

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
    class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-md border"
    @submit.prevent="save"
  >
    <FormRow label="Name">
      <Input v-model="state.name" required />
    </FormRow>
    <FormRow label="Type">
      <AppSelect v-model="state.type" :options="liabilityTypeOptions" />
    </FormRow>
    <FormRow label="Start date">
      <Input v-model="state.startDate" type="date" />
    </FormRow>
    <FormRow label="End date (optional)">
      <Input v-model="state.endDate" type="date" />
    </FormRow>
    <FormRow v-if="!props.liability" label="Initial balance">
      <Input v-model.number="state.initialBalance" type="number" step="0.01" />
    </FormRow>
    <FormRow label="Interest type">
      <AppSelect v-model="state.growthType" :options="growthTypeOptions" />
    </FormRow>
    <FormRow label="Annual rate">
      <Input v-model.number="state.rate" type="number" step="0.0001" />
    </FormRow>
    <FormRow v-if="state.growthType === 'compounding'" label="Compounding frequency">
      <AppSelect v-model="state.compoundingFrequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Repayment amount">
      <Input v-model.number="state.repayment" type="number" step="0.01" />
    </FormRow>
    <FormRow label="Repayment frequency">
      <AppSelect v-model="state.paymentFrequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Source account">
      <AppSelect
        v-model="state.sourceAccountId"
        :options="assetOptions"
        placeholder="— select —"
      />
    </FormRow>
    <template v-if="state.type === 'credit_card'">
      <FormRow label="Grace period (days)">
        <Input v-model.number="state.creditCardGracePeriodDays" type="number" min="0" />
      </FormRow>
      <FormRow label="Revolving">
        <input v-model="state.creditCardRevolving" type="checkbox" class="self-start size-4" />
      </FormRow>
    </template>

    <div v-if="error" class="md:col-span-2 text-sm text-destructive">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
      <Button
        v-if="props.liability"
        type="button"
        variant="destructive"
        size="sm"
        @click="emit('delete', props.liability.id)"
      >
        Delete
      </Button>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" size="sm">Save</Button>
    </div>
  </form>
</template>
