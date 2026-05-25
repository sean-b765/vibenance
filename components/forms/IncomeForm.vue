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

const formSchema = toTypedSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['wage', 'winnings', 'inheritance', 'rental', 'other']),
    amount: z.coerce.number().min(0, 'Amount must be ≥ 0'),
    pretax: z.boolean(),
    destinationAccountId: z.string().uuid('Destination account is required'),
    frequency: z.enum(['one-off', 'daily', 'weekly', 'fortnightly', 'monthly', 'annually']),
    paymentDate: z.string().optional().default(''),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().default(''),
  }),
)

const blank = () => ({
  id: uuidv7(),
  name: '',
  type: 'wage' as IncomeType,
  amount: 0,
  pretax: true,
  destinationAccountId: '',
  frequency: 'fortnightly' as FrequencyKind | 'one-off',
  paymentDate: '',
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
})

const fromIncome = (i: Income) => ({
  id: i.id,
  name: i.name,
  type: i.type,
  amount: i.amount,
  pretax: i.pretax,
  destinationAccountId: i.destinationAccountId,
  frequency: (i.frequency?.kind ?? 'one-off') as FrequencyKind | 'one-off',
  paymentDate: toDateInput(i.paymentDate),
  startDate: toDateInput(i.startDate),
  endDate: toDateInput(i.endDate),
})

const form = useForm({
  validationSchema: formSchema,
  initialValues: props.income ? fromIncome(props.income) : blank(),
})

watch(
  () => props.income,
  (i) => form.resetForm({ values: i ? fromIncome(i) : blank() }),
)

const onSubmit = form.handleSubmit(
  (v) => {
    const candidate: Income = {
      id: v.id,
      name: v.name.trim(),
      type: v.type,
      amount: Number(v.amount),
      pretax: v.pretax,
      destinationAccountId: v.destinationAccountId,
      frequency: v.frequency === 'one-off' ? null : { kind: v.frequency },
      startDate: requireDateInput(v.startDate),
      tagIds: props.income?.tagIds ?? [],
    }
    const pay = fromDateInput(v.paymentDate)
    if (pay) candidate.paymentDate = pay
    const end = fromDateInput(v.endDate)
    if (end) candidate.endDate = end

    const parsed = incomeSchema.safeParse(candidate)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid income'
      toast.error(`Save failed: ${msg}`)
      return
    }
    emit('save', parsed.data)
  },
  ({ errors }) => {
    const msg = Object.values(errors)[0] ?? 'Invalid income'
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
        <FormLabel>Type</FormLabel>
        <FormControl><AppSelect v-bind="componentField" :options="incomeTypeOptions" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="amount">
      <FormItem>
        <FormLabel>Amount per payment <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="number" step="0.01" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ value, handleChange }" name="pretax">
      <FormItem>
        <FormLabel>Pretax</FormLabel>
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

    <FormField v-slot="{ componentField }" name="destinationAccountId">
      <FormItem>
        <FormLabel>Destination account <span class="text-destructive">*</span></FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="assetOptions" placeholder="— select —" />
        </FormControl>
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

    <FormField v-slot="{ componentField }" name="paymentDate">
      <FormItem>
        <FormLabel>Payment date</FormLabel>
        <FormControl><Input type="date" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

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
