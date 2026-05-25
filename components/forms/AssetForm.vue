<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import AppSelect from '@/components/forms/AppSelect.vue'
import WarningChip from '@/components/WarningChip.vue'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { assetSchema, type Asset, type AssetType } from '@/core/schemas/asset'
import type { FrequencyKind } from '@/core/schemas/frequency'
import type { Liability } from '@/core/schemas/liability'
import { checkAsset, type Warning } from '@/core/validation/warnings'
import { fromDateInput, requireDateInput, toDateInput } from '@/utils/dateInput'

const props = defineProps<{
  asset?: Asset
  liabilities: Liability[]
}>()

const emit = defineEmits<{
  (e: 'save', asset: Asset): void
  (e: 'cancel'): void
  (e: 'delete', id: string): void
}>()

const assetTypes: AssetType[] = [
  'account_cash',
  'account_savings',
  'account_offset',
  'account_investment',
  'property',
  'vehicle',
]
const frequencies: FrequencyKind[] = ['daily', 'weekly', 'fortnightly', 'monthly', 'annually']

const assetTypeOptions = assetTypes.map((t) => ({ value: t, label: t }))
const growthTypeOptions: { value: 'simple' | 'compounding'; label: string }[] = [
  { value: 'simple', label: 'simple' },
  { value: 'compounding', label: 'compounding' },
]
const frequencyOptions = frequencies.map((f) => ({ value: f, label: f }))
const linkedLiabilityOptions = computed(() =>
  props.liabilities.map((l) => ({ value: l.id, label: l.name })),
)

const formSchema = toTypedSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Name is required'),
    type: z.enum([
      'account_cash',
      'account_savings',
      'account_offset',
      'account_investment',
      'property',
      'vehicle',
    ]),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional().default(''),
    growthType: z.enum(['simple', 'compounding']),
    rate: z.coerce.number(),
    compoundingFrequency: z.enum(['daily', 'weekly', 'fortnightly', 'monthly', 'annually']),
    linkedLiabilityId: z.string().optional().default(''),
    initialBalance: z.coerce.number(),
  }),
)

const blank = () => ({
  id: uuidv7(),
  name: '',
  type: 'account_cash' as AssetType,
  startDate: toDateInput(new Date().toISOString()),
  endDate: '',
  growthType: 'simple' as 'simple' | 'compounding',
  rate: 0,
  compoundingFrequency: 'monthly' as FrequencyKind,
  linkedLiabilityId: '',
  initialBalance: 0,
})

const fromAsset = (a: Asset) => ({
  id: a.id,
  name: a.name,
  type: a.type,
  startDate: toDateInput(a.startDate),
  endDate: toDateInput(a.endDate),
  growthType: a.growth.type,
  rate: a.growth.rate,
  compoundingFrequency: a.growth.compoundingFrequency?.kind ?? 'monthly',
  linkedLiabilityId: a.linkedLiabilityId ?? '',
  initialBalance: a.snapshots[a.snapshots.length - 1]?.value ?? 0,
})

const form = useForm({
  validationSchema: formSchema,
  initialValues: props.asset ? fromAsset(props.asset) : blank(),
})

watch(
  () => props.asset,
  (a) => form.resetForm({ values: a ? fromAsset(a) : blank() }),
)

const buildCandidate = (v: ReturnType<typeof blank>): Asset => {
  const existing = props.asset
  const snapshots = existing?.snapshots ?? []
  const hasSnapshot = snapshots.length > 0
  const candidate: Asset = {
    id: v.id,
    name: v.name.trim(),
    type: v.type,
    startDate: requireDateInput(v.startDate || new Date().toISOString()),
    snapshots: hasSnapshot
      ? snapshots
      : [{ date: new Date().toISOString(), value: Number(v.initialBalance), actual: true }],
    growth: {
      type: v.growthType,
      rate: Number(v.rate),
      ...(v.growthType === 'compounding'
        ? { compoundingFrequency: { kind: v.compoundingFrequency } }
        : {}),
    },
    tagIds: existing?.tagIds ?? [],
  }
  const end = fromDateInput(v.endDate)
  if (end) candidate.endDate = end
  if (v.linkedLiabilityId) candidate.linkedLiabilityId = v.linkedLiabilityId
  return candidate
}

const draftWarnings = computed<Warning[]>(() => {
  try {
    return checkAsset(buildCandidate(form.values as ReturnType<typeof blank>))
  } catch {
    return []
  }
})
const warningsForField = (field: string) =>
  draftWarnings.value.filter((w) => w.field === field)

const onSubmit = form.handleSubmit(
  (values) => {
    const candidate = buildCandidate(values)
    const parsed = assetSchema.safeParse(candidate)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid asset'
      toast.error(`Save failed: ${msg}`)
      return
    }
    emit('save', parsed.data)
  },
  ({ errors }) => {
    const msg = Object.values(errors)[0] ?? 'Invalid asset'
    toast.error(`Save failed: ${msg}`)
  },
)
</script>

<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/40 rounded-md border" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>Name <span class="text-destructive">*</span></FormLabel>
        <FormControl>
          <Input v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="type">
      <FormItem>
        <FormLabel>Type</FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="assetTypeOptions" placeholder="Type" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="startDate">
      <FormItem>
        <FormLabel>Start date <span class="text-destructive">*</span></FormLabel>
        <FormControl>
          <Input type="date" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="endDate">
      <FormItem>
        <FormLabel>End date</FormLabel>
        <FormControl>
          <Input type="date" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="!props.asset" v-slot="{ componentField }" name="initialBalance">
      <FormItem>
        <FormLabel>Initial balance</FormLabel>
        <FormControl>
          <Input type="number" step="0.01" v-bind="componentField" />
        </FormControl>
        <WarningChip v-for="w in warningsForField('snapshots.0.value')" :key="w.code" :warning="w" />
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="growthType">
      <FormItem>
        <FormLabel>Growth type</FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="growthTypeOptions" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="rate">
      <FormItem>
        <FormLabel>Annual rate (e.g. 0.05 = 5%)</FormLabel>
        <FormControl>
          <Input type="number" step="0.0001" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="form.values.growthType === 'compounding'" v-slot="{ componentField }" name="compoundingFrequency">
      <FormItem>
        <FormLabel>Compounding frequency</FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="frequencyOptions" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="form.values.type === 'account_offset'" v-slot="{ componentField }" name="linkedLiabilityId">
      <FormItem>
        <FormLabel>Linked liability</FormLabel>
        <FormControl>
          <AppSelect v-bind="componentField" :options="linkedLiabilityOptions" placeholder="— none —" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="md:col-span-2 flex gap-2 justify-end pt-2 border-t">
      <Button v-if="props.asset" type="button" variant="destructive" size="sm" @click="emit('delete', props.asset.id)">
        Delete
      </Button>
      <Button type="button" variant="outline" size="sm" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" size="sm">Save</Button>
    </div>
  </form>
</template>
