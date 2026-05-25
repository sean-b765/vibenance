<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import AppSelect from '@/components/forms/AppSelect.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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

const formSchema = toTypedSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    type: z.string().min(1, 'Category is required'),
    amount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
    sourceAccountId: z.string().uuid('Source account is required'),
    frequency: z.enum(['one-off', 'daily', 'weekly', 'fortnightly', 'monthly', 'annually']),
    paymentDate: z.string().min(1, 'Payment date is required'),
    fixed: z.boolean(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().default(''),
  }),
)

const blank = () => ({
  id: uuidv7(),
  name: '',
  type: 'other',
  amount: 0,
  sourceAccountId: '',
  frequency: 'monthly' as FrequencyKind | 'one-off',
  paymentDate: toDateInput(new Date().toISOString()),
  fixed: false,
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
})

const fromExpense = (e: Expense) => ({
  id: e.id,
  name: e.name,
  type: e.type,
  amount: e.amount,
  sourceAccountId: e.sourceAccountId,
  frequency: (e.frequency?.kind ?? 'one-off') as FrequencyKind | 'one-off',
  paymentDate: toDateInput(e.paymentDate),
  fixed: e.fixed,
  startDate: toDateInput(e.startDate),
  endDate: toDateInput(e.endDate),
})

const form = useForm({
  validationSchema: formSchema,
  initialValues: props.expense ? fromExpense(props.expense) : blank(),
})

watch(
  () => props.expense,
  (e) => form.resetForm({ values: e ? fromExpense(e) : blank() }),
)

const onSubmit = form.handleSubmit(
  (v) => {
    const candidate: Expense = {
      id: v.id,
      name: v.name.trim(),
      type: v.type.trim(),
      amount: Number(v.amount),
      sourceAccountId: v.sourceAccountId,
      frequency: v.frequency === 'one-off' ? null : { kind: v.frequency },
      paymentDate: requireDateInput(v.paymentDate || v.startDate),
      fixed: v.fixed,
      startDate: requireDateInput(v.startDate),
      tagIds: props.expense?.tagIds ?? [],
    }
    const end = fromDateInput(v.endDate)
    if (end) candidate.endDate = end

    const parsed = expenseSchema.safeParse(candidate)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid expense'
      toast.error(`Save failed: ${msg}`)
      return
    }
    emit('save', parsed.data)
  },
  ({ errors }) => {
    const msg = Object.values(errors)[0] ?? 'Invalid expense'
    toast.error(`Save failed: ${msg}`)
  },
)
</script>

<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-md border" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>Name <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="type">
      <FormItem>
        <FormLabel>Category <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input placeholder="e.g. groceries" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="amount">
      <FormItem>
        <FormLabel>Amount <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="number" step="0.01" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ value, handleChange }" name="fixed">
      <FormItem>
        <FormLabel>Fixed</FormLabel>
        <FormControl>
          <Checkbox :model-value="value" class="self-start" @update:model-value="handleChange" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="frequency">
      <FormItem>
        <FormLabel>Frequency</FormLabel>
        <FormControl><AppSelect v-bind="componentField" :options="frequencyOptions" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="sourceAccountId">
      <FormItem>
        <FormLabel>Source account <span class="text-destructive">*</span></FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="assetOptions" placeholder="— select —" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="paymentDate">
      <FormItem>
        <FormLabel>Payment date <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="date" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="startDate">
      <FormItem>
        <FormLabel>Start date <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="date" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="endDate">
      <FormItem>
        <FormLabel>End date</FormLabel>
        <FormControl><Input type="date" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

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
