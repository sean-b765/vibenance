<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { uuidv7 } from 'uuidv7'
import FormRow from '@/components/forms/FormRow.vue'
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
    error.value = parsed.error.issues[0]?.message ?? 'Invalid income'
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
        <option v-for="t in incomeTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </FormRow>
    <FormRow label="Amount per payment">
      <input v-model.number="state.amount" type="number" step="0.01" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Pretax">
      <input v-model="state.pretax" type="checkbox" class="self-start" />
    </FormRow>
    <FormRow label="Frequency">
      <select v-model="state.frequency" class="border border-neutral-300 rounded px-2 py-1">
        <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
      </select>
    </FormRow>
    <FormRow label="Destination account">
      <select v-model="state.destinationAccountId" required class="border border-neutral-300 rounded px-2 py-1">
        <option value="">— select —</option>
        <option v-for="a in props.assets" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </FormRow>
    <FormRow label="Start date">
      <input v-model="state.startDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="End date (optional)">
      <input v-model="state.endDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>
    <FormRow label="Payment date (optional)">
      <input v-model="state.paymentDate" type="date" class="border border-neutral-300 rounded px-2 py-1" />
    </FormRow>

    <div v-if="error" class="md:col-span-2 text-sm text-red-600">{{ error }}</div>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t border-neutral-200">
      <button
        v-if="props.income"
        type="button"
        class="px-3 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50"
        @click="emit('delete', props.income.id)"
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
