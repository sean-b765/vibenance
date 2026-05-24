<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import AppSelect from '@/components/forms/AppSelect.vue'
import FormRow from '@/components/forms/FormRow.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import { incomeSchema, type Income, type IncomeType } from '@/core/schemas/income'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'

const props = defineProps<{
  income?: Income
  assets: Asset[]
}>()

const emit = defineEmits<{
  (e: 'save', income: Income): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const incomeTypes: IncomeType[] = ['wage', 'winnings', 'inheritance', 'rental', 'other']
const frequencies: (FrequencyKind | 'one-off')[] = [
  'one-off',
  'daily',
  'weekly',
  'fortnightly',
  'monthly',
  'annually',
]

const incomeTypeOptions = incomeTypes.map((t) => ({ value: t, label: t }))
const frequencyOptions = frequencies.map((f) => ({ value: f, label: f }))
const assetOptions = computed(() => props.assets.map((a) => ({ value: a.id, label: a.name })))

type FormState = {
  id: string
  name: string
  type: IncomeType
  amount: number
  pretax: boolean
  destinationAccountId: string
  frequency: FrequencyKind | 'one-off'
  paymentDate: string
  startDate: string
  endDate: string
}

const blank = (): FormState => ({
  id: uuidv7(),
  name: '',
  type: 'wage',
  amount: 0,
  pretax: true,
  destinationAccountId: '',
  frequency: 'fortnightly',
  paymentDate: '',
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
})

const fromIncome = (i: Income): FormState => ({
  id: i.id,
  name: i.name,
  type: i.type,
  amount: i.amount,
  pretax: i.pretax,
  destinationAccountId: i.destinationAccountId,
  frequency: i.frequency?.kind ?? 'one-off',
  paymentDate: toDateInput(i.paymentDate),
  startDate: toDateInput(i.startDate),
  endDate: toDateInput(i.endDate),
})

const state = reactive<FormState>(props.income ? fromIncome(props.income) : blank())
watch(
  () => props.income,
  (i) => Object.assign(state, i ? fromIncome(i) : blank()),
)

const error = ref('')

const save = () => {
  error.value = ''
  const candidate: Income = {
    id: state.id,
    name: state.name.trim(),
    type: state.type,
    amount: Number(state.amount),
    pretax: state.pretax,
    destinationAccountId: state.destinationAccountId,
    frequency: state.frequency === 'one-off' ? null : { kind: state.frequency },
    startDate: requireDateInput(state.startDate),
    tagIds: props.income?.tagIds ?? [],
  }
  const pay = fromDateInput(state.paymentDate)
  if (pay) candidate.paymentDate = pay
  const end = fromDateInput(state.endDate)
  if (end) candidate.endDate = end

  const parsed = incomeSchema.safeParse(candidate)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid income'
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
      <AppSelect v-model="state.type" :options="incomeTypeOptions" />
    </FormRow>
    <FormRow label="Amount per payment">
      <Input v-model.number="state.amount" type="number" step="0.01" />
    </FormRow>
    <FormRow label="Pretax">
      <Checkbox v-model="state.pretax" class="self-start" />
    </FormRow>
    <FormRow label="Frequency">
      <AppSelect v-model="state.frequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Destination account">
      <AppSelect
        v-model="state.destinationAccountId"
        :options="assetOptions"
        placeholder="— select —"
      />
    </FormRow>
    <FormRow label="Start date">
      <Input v-model="state.startDate" type="date" />
    </FormRow>
    <FormRow label="End date (optional)">
      <Input v-model="state.endDate" type="date" />
    </FormRow>
    <FormRow label="Payment date (optional)">
      <Input v-model="state.paymentDate" type="date" />
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-destructive">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
      <Button
        v-if="props.income"
        type="button"
        variant="destructive"
        size="sm"
        @click="emit('delete', props.income.id)"
      >
        Delete
      </Button>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" size="sm">Save</Button>
    </div>
  </form>
</template>
