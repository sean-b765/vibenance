<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import FormRow from '@/components/forms/FormRow.vue'
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
    class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded border border-neutral-200"
    @submit.prevent="save"
  >
    <FormRow label="Name">
      <input v-model="state.name" required class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Category">
      <input v-model="state.type" placeholder="e.g. groceries" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Amount">
      <input v-model.number="state.amount" type="number" step="0.01" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Fixed">
      <input v-model="state.fixed" type="checkbox" class="self-start" />
    </FormRow>
    <FormRow label="Frequency">
      <select v-model="state.frequency" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
      </select>
    </FormRow>
    <FormRow label="Source account">
      <select v-model="state.sourceAccountId" required class="border border-neutral-300 rounded px-2 py-1">
        <option value="">— select —</option>
        <option v-for="a in props.assets" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </FormRow>
    <FormRow label="Payment date">
      <input v-model="state.paymentDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Start date">
      <input v-model="state.startDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="End date (optional)">
      <input v-model="state.endDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-red-600">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t border-neutral-200">
      <button
        v-if="props.expense"
        type="button"
        class="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
        @click="emit('delete', props.expense.id)"
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
