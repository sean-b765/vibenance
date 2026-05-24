<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import AppSelect from '@/components/forms/AppSelect.vue'
import FormRow from '@/components/forms/FormRow.vue'
import WarningChip from '@/components/WarningChip.vue'
import WarningsList from '@/components/WarningsList.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import { liabilitySchema, type Liability, type LiabilityType } from '@/core/schemas/liability'
import { checkLiability, type Warning } from '@/core/validation/warnings'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'
import { zodErrors } from '@/core/validation/warnings'

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
const errors = ref<Record<string, string>>({})

const buildCandidate = (): Liability => {
  const existing = props.liability
  const snapshots = existing?.snapshots ?? []
  const candidate: Liability = {
    id: state.id,
    name: state.name.trim(),
    type: state.type,
    startDate: requireDateInput(state.startDate || new Date().toISOString()),
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
  return candidate
}

const draftWarnings = computed<Warning[]>(() => {
  try {
    return checkLiability(buildCandidate(), {
      assets: props.assets,
      liabilities: [],
      incomes: [],
      expenses: [],
    })
  } catch {
    return []
  }
})
const warningsForField = (field: string) =>
  draftWarnings.value.filter((w) => w.field === field)

const save = () => {
  error.value = ''
  errors.value = {}
  const candidate = buildCandidate()
  const parsed = liabilitySchema.safeParse(candidate)
  if (!parsed.success) {
    errors.value = zodErrors(parsed.error.issues)
    const msg = parsed.error.issues[0]?.message ?? 'Invalid liability'
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
    <FormRow label="Name" required :error="errors.name">
      <Input v-model="state.name" required :aria-invalid="!!errors.name" />
    </FormRow>
    <FormRow label="Type" :error="errors.type">
      <AppSelect v-model="state.type" :options="liabilityTypeOptions" />
    </FormRow>
    <FormRow label="Start date" required :error="errors.startDate">
      <Input v-model="state.startDate" type="date" :aria-invalid="!!errors.startDate" />
    </FormRow>
    <FormRow label="End date" :error="errors.endDate">
      <Input v-model="state.endDate" type="date" :aria-invalid="!!errors.endDate" />
    </FormRow>
    <FormRow v-if="!props.liability" label="Initial balance" :error="errors['snapshots.0.value']">
      <Input
        v-model.number="state.initialBalance"
        type="number"
        step="0.01"
        :aria-invalid="!!errors['snapshots.0.value']"
      />
    </FormRow>
    <FormRow label="Interest type" :error="errors['interest.type']">
      <AppSelect v-model="state.growthType" :options="growthTypeOptions" />
    </FormRow>
    <FormRow label="Annual rate" required :error="errors['interest.rate']">
      <Input
        v-model.number="state.rate"
        type="number"
        step="0.0001"
        :aria-invalid="!!errors['interest.rate']"
      />
    </FormRow>
    <FormRow
      v-if="state.growthType === 'compounding'"
      label="Compounding frequency"
      :error="errors['interest.compoundingFrequency.kind']"
    >
      <AppSelect v-model="state.compoundingFrequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Repayment amount" required :error="errors.repayment">
      <Input
        v-model.number="state.repayment"
        type="number"
        step="0.01"
        :aria-invalid="!!errors.repayment"
      />
      <WarningChip
        v-for="w in warningsForField('repayment')"
        :key="w.code"
        :warning="w"
      />
    </FormRow>
    <FormRow label="Repayment frequency" :error="errors['paymentFrequency.kind']">
      <AppSelect v-model="state.paymentFrequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Source account" required :error="errors.sourceAccountId">
      <AppSelect
        v-model="state.sourceAccountId"
        :options="assetOptions"
        placeholder="— select —"
      />
      <WarningChip
        v-for="w in warningsForField('sourceAccountId')"
        :key="w.code"
        :warning="w"
      />
    </FormRow>
    <template v-if="state.type === 'credit_card'">
      <FormRow label="Grace period (days)" :error="errors.creditCardGracePeriodDays">
        <Input
          v-model.number="state.creditCardGracePeriodDays"
          type="number"
          min="0"
          :aria-invalid="!!errors.creditCardGracePeriodDays"
        />
      </FormRow>
      <FormRow label="Revolving">
        <Checkbox v-model="state.creditCardRevolving" class="self-start" />
      </FormRow>
    </template>

    <div v-if="draftWarnings.length > 0" class="md:col-span-2 border-t pt-2">
      <WarningsList :warnings="draftWarnings" />
    </div>

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
