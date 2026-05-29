<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import AppSelect from '@/components/forms/AppSelect.vue'
import VariableRatesDrawer from '@/components/forms/VariableRatesDrawer.vue'
import WarningChip from '@/components/WarningChip.vue'
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
import { Label } from '@/components/ui/label'
import type { Asset } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import type { RatePeriod } from '@/core/schemas/growth'
import { liabilitySchema, type Liability, type LiabilityType } from '@/core/schemas/liability'
import { checkLiability, type Warning } from '@/core/validation/warnings'
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

const formSchema = toTypedSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['mortgage', 'personal_loan', 'credit_card', 'car_loan']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().default(''),
    growthType: z.enum(['simple', 'compounding']),
    rate: z.coerce.number().min(0, 'Rate must be ≥ 0'),
    compoundingFrequency: z.enum(['daily', 'weekly', 'fortnightly', 'monthly', 'annually']),
    repayment: z.coerce.number().min(0, 'Repayment must be ≥ 0'),
    paymentFrequency: z.enum(['daily', 'weekly', 'fortnightly', 'monthly', 'annually']),
    sourceAccountId: z.string().uuid('Source account is required'),
    creditCardGracePeriodDays: z.coerce.number().min(0),
    creditCardRevolving: z.boolean(),
    initialBalance: z.coerce.number(),
  }),
)

const blank = () => ({
  id: uuidv7(),
  name: '',
  type: 'mortgage' as LiabilityType,
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
  growthType: 'compounding' as 'simple' | 'compounding',
  rate: 0.06,
  compoundingFrequency: 'monthly' as FrequencyKind,
  repayment: 0,
  paymentFrequency: 'monthly' as FrequencyKind,
  sourceAccountId: '',
  creditCardGracePeriodDays: 55,
  creditCardRevolving: false,
  initialBalance: 0,
})

const fromLiability = (l: Liability) => ({
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

const form = useForm({
  validationSchema: formSchema,
  initialValues: props.liability ? fromLiability(props.liability) : blank(),
})

const variableRates = ref<RatePeriod[]>(props.liability?.interest.variableRates ?? [])

watch(
  () => props.liability,
  (l) => {
    form.resetForm({ values: l ? fromLiability(l) : blank() })
    variableRates.value = l?.interest.variableRates ?? []
  },
)

const buildCandidate = (v: ReturnType<typeof blank>): Liability => {
  const existing = props.liability
  const snapshots = existing?.snapshots ?? []
  const candidate: Liability = {
    id: v.id,
    name: v.name.trim(),
    type: v.type,
    startDate: requireDateInput(v.startDate || new Date().toISOString()),
    snapshots:
      snapshots.length > 0
        ? snapshots
        : [{ date: new Date().toISOString(), value: Number(v.initialBalance), actual: true }],
    interest: {
      type: v.growthType,
      rate: Number(v.rate),
      ...(v.growthType === 'compounding'
        ? { compoundingFrequency: { kind: v.compoundingFrequency } }
        : {}),
      ...(variableRates.value.length > 0 ? { variableRates: variableRates.value } : {}),
    },
    repayment: Number(v.repayment),
    paymentFrequency: { kind: v.paymentFrequency },
    sourceAccountId: v.sourceAccountId,
    tagIds: existing?.tagIds ?? [],
  }
  const end = fromDateInput(v.endDate)
  if (end) candidate.endDate = end
  if (v.type === 'credit_card') {
    candidate.creditCardGracePeriodDays = Number(v.creditCardGracePeriodDays)
    candidate.creditCardRevolving = v.creditCardRevolving
  }
  return candidate
}

const draftWarnings = computed<Warning[]>(() => {
  try {
    return checkLiability(buildCandidate(form.values as ReturnType<typeof blank>), {
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

const onSubmit = form.handleSubmit(
  (values) => {
    const candidate = buildCandidate(values)
    const parsed = liabilitySchema.safeParse(candidate)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid liability'
      toast.error(`Save failed: ${msg}`)
      return
    }
    emit('save', parsed.data)
  },
  ({ errors }) => {
    const msg = Object.values(errors)[0] ?? 'Invalid liability'
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
        <FormControl><AppSelect v-bind="componentField" :options="liabilityTypeOptions" /></FormControl>
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

    <FormField v-if="!props.liability" v-slot="{ componentField }" name="initialBalance">
      <FormItem>
        <FormLabel>Initial balance</FormLabel>
        <FormControl><Input type="number" step="0.01" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="growthType">
      <FormItem>
        <FormLabel>Interest type</FormLabel>
        <FormControl><AppSelect v-bind="componentField" :options="growthTypeOptions" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="rate">
      <FormItem>
        <FormLabel>Annual rate <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="number" step="0.0001" v-bind="componentField" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="form.values.growthType === 'compounding'" v-slot="{ componentField }" name="compoundingFrequency">
      <FormItem>
        <FormLabel>Compounding frequency</FormLabel>
        <FormControl><AppSelect v-bind="componentField" :options="frequencyOptions" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="md:col-span-2 flex flex-col gap-2">
      <Label>Variable rates</Label>
      <VariableRatesDrawer v-model="variableRates" />
    </div>

    <FormField v-slot="{ componentField }" name="repayment">
      <FormItem>
        <FormLabel>Repayment amount <span class="text-destructive">*</span></FormLabel>
        <FormControl><Input type="number" step="0.01" v-bind="componentField" /></FormControl>
        <WarningChip v-for="w in warningsForField('repayment')" :key="w.code" :warning="w" />
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="paymentFrequency">
      <FormItem>
        <FormLabel>Repayment frequency</FormLabel>
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
        <WarningChip v-for="w in warningsForField('sourceAccountId')" :key="w.code" :warning="w" />
        <FormMessage />
      </FormItem>
    </FormField>

    <template v-if="form.values.type === 'credit_card'">
      <FormField v-slot="{ componentField }" name="creditCardGracePeriodDays">
        <FormItem>
          <FormLabel>Grace period (days)</FormLabel>
          <FormControl><Input type="number" min="0" v-bind="componentField" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ value, handleChange }" name="creditCardRevolving">
        <FormItem>
          <FormLabel>Revolving</FormLabel>
          <FormControl>
            <Checkbox :model-value="value" class="self-start" @update:model-value="handleChange" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </template>

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
