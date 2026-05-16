<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import AppSelect from '@/components/forms/AppSelect.vue'
import FormRow from '@/components/forms/FormRow.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Asset } from '@/core/schemas/asset'
import { expenseSchema, type Expense } from '@/core/schemas/expense'
import type { FrequencyKind } from '@/core/schemas/frequency'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'

const props = defineProps<{
  expense?: Expense
  assets: Asset[]
}>()

const emit = defineEmits<{
  (e: 'save', expense: Expense): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const frequencies: (FrequencyKind | 'one-off')[] = [
  'one-off',
  'daily',
  'weekly',
  'fortnightly',
  'monthly',
  'annually',
]

const frequencyOptions = frequencies.map((f) => ({ value: f, label: f }))
const assetOptions = computed(() => props.assets.map((a) => ({ value: a.id, label: a.name })))

type FormState = {
  id: string
  name: string
  type: string
  amount: number
  sourceAccountId: string
  frequency: FrequencyKind | 'one-off'
  paymentDate: string
  fixed: boolean
  startDate: string
  endDate: string
}

const blank = (): FormState => ({
  id: uuidv7(),
  name: '',
  type: 'other',
  amount: 0,
  sourceAccountId: '',
  frequency: 'monthly',
  paymentDate: toDateInput(new Date().toISOString()),
  fixed: false,
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
})

const fromExpense = (e: Expense): FormState => ({
  id: e.id,
  name: e.name,
  type: e.type,
  amount: e.amount,
  sourceAccountId: e.sourceAccountId,
  frequency: e.frequency?.kind ?? 'one-off',
  paymentDate: toDateInput(e.paymentDate),
  fixed: e.fixed,
  startDate: toDateInput(e.startDate),
  endDate: toDateInput(e.endDate),
})

const state = reactive<FormState>(props.expense ? fromExpense(props.expense) : blank())
watch(
  () => props.expense,
  (e) => Object.assign(state, e ? fromExpense(e) : blank()),
)

const error = ref('')

const save = () => {
  error.value = ''
  const candidate: Expense = {
    id: state.id,
    name: state.name.trim(),
    type: state.type.trim(),
    amount: Number(state.amount),
    sourceAccountId: state.sourceAccountId,
    frequency: state.frequency === 'one-off' ? null : { kind: state.frequency },
    paymentDate: requireDateInput(state.paymentDate || state.startDate),
    fixed: state.fixed,
    startDate: requireDateInput(state.startDate),
    tagIds: props.expense?.tagIds ?? [],
  }
  const end = fromDateInput(state.endDate)
  if (end) candidate.endDate = end

  const parsed = expenseSchema.safeParse(candidate)
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? 'Invalid expense'
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
    <FormRow label="Category">
      <Input v-model="state.type" placeholder="e.g. groceries" />
    </FormRow>
    <FormRow label="Amount">
      <Input v-model.number="state.amount" type="number" step="0.01" />
    </FormRow>
    <FormRow label="Fixed">
      <input v-model="state.fixed" type="checkbox" class="self-start size-4" />
    </FormRow>
    <FormRow label="Frequency">
      <AppSelect v-model="state.frequency" :options="frequencyOptions" />
    </FormRow>
    <FormRow label="Source account">
      <AppSelect
        v-model="state.sourceAccountId"
        :options="assetOptions"
        placeholder="— select —"
      />
    </FormRow>
    <FormRow label="Payment date">
      <Input v-model="state.paymentDate" type="date" />
    </FormRow>
    <FormRow label="Start date">
      <Input v-model="state.startDate" type="date" />
    </FormRow>
    <FormRow label="End date (optional)">
      <Input v-model="state.endDate" type="date" />
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-destructive">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
      <Button
        v-if="props.expense"
        type="button"
        variant="destructive"
        size="sm"
        @click="emit('delete', props.expense.id)"
      >
        Delete
      </Button>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" size="sm">Save</Button>
    </div>
  </form>
</template>
