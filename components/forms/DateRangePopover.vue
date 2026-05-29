<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseDate, type DateValue } from '@internationalized/date'
import { RangeCalendarRoot, type DateRange } from 'reka-ui'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  RangeCalendarGrid,
  RangeCalendarGridBody,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarNextButton,
  RangeCalendarPrevButton,
} from '@/components/ui/range-calendar'

type ViewMode = 'day' | 'month' | 'year'
type YM = { y: number; m: number }

const props = defineProps<{
  startDate: string
  endDate?: string
}>()

const emit = defineEmits<{
  (e: 'update:range', value: { startDate: string; endDate?: string }): void
  (e: 'clear-end'): void
}>()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const viewMode = ref<ViewMode>('day')
const cycleView = () => {
  viewMode.value = viewMode.value === 'day' ? 'month' : viewMode.value === 'month' ? 'year' : 'day'
}

const toCalendarDate = (iso?: string): DateValue | undefined => {
  if (!iso) return undefined
  try {
    return parseDate(iso.slice(0, 10))
  } catch {
    return undefined
  }
}

const toIsoDay = (y: number, m: number, d: number): string => {
  const yy = String(y).padStart(4, '0')
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${yy}-${mm}-${dd}T00:00:00.000Z`
}

const formatIso = (iso?: string): string => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const triggerLabel = computed(() => {
  const start = formatIso(props.startDate) || 'Pick start'
  const end = props.endDate ? formatIso(props.endDate) : 'ongoing'
  return `${start} → ${end}`
})

const dayRange = computed<DateRange>(() => ({
  start: toCalendarDate(props.startDate),
  end: toCalendarDate(props.endDate),
}))

const onDayRange = (value: DateRange) => {
  const s = value.start
  if (!s) return
  const startIso = toIsoDay(s.year, s.month, s.day)
  const e = value.end
  const endIso = e ? toIsoDay(e.year, e.month, e.day) : undefined
  emit('update:range', { startDate: startIso, endDate: endIso })
}

const startYear = computed(() => {
  const cd = toCalendarDate(props.startDate)
  return cd?.year ?? new Date().getFullYear()
})

const monthYear = ref<number>(startYear.value)
const monthPending = ref<YM | null>(null)

const cmpYM = (a: YM, b: YM) => (a.y === b.y ? a.m - b.m : a.y - b.y)
const addMonth = (ym: YM): YM => (ym.m === 12 ? { y: ym.y + 1, m: 1 } : { y: ym.y, m: ym.m + 1 })

const onPickMonth = (m: number) => {
  const ym: YM = { y: monthYear.value, m }
  if (!monthPending.value) {
    monthPending.value = ym
    return
  }
  const a = monthPending.value
  const [lo, hi] = cmpYM(a, ym) <= 0 ? [a, ym] : [ym, a]
  const endYM = addMonth(hi)
  emit('update:range', {
    startDate: toIsoDay(lo.y, lo.m, 1),
    endDate: toIsoDay(endYM.y, endYM.m, 1),
  })
  monthPending.value = null
}

const isMonthPending = (m: number) =>
  monthPending.value !== null &&
  monthPending.value.y === monthYear.value &&
  monthPending.value.m === m

const selectedStartCD = computed(() => toCalendarDate(props.startDate))
const selectedEndCD = computed(() => toCalendarDate(props.endDate))

const isMonthSelected = (m: number): boolean => {
  const s = selectedStartCD.value
  if (!s) return false
  const cur: YM = { y: monthYear.value, m }
  const startYM: YM = { y: s.year, m: s.month }
  if (cmpYM(cur, startYM) < 0) return false
  const e = selectedEndCD.value
  if (!e) return true
  const lastYM: YM = e.month === 1 ? { y: e.year - 1, m: 12 } : { y: e.year, m: e.month - 1 }
  return cmpYM(cur, lastYM) <= 0
}

const monthVariant = (m: number): 'default' | 'outline' =>
  isMonthPending(m) || isMonthSelected(m) ? 'default' : 'outline'

const monthBtnClass = (m: number) =>
  isMonthSelected(m) && !isMonthPending(m)
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : ''

const yearPageStart = ref<number>(Math.floor(startYear.value / 12) * 12)
const yearPending = ref<number | null>(null)

const yearGrid = computed(() =>
  Array.from({ length: 12 }, (_, i) => yearPageStart.value + i),
)

const onPickYear = (y: number) => {
  if (yearPending.value === null) {
    yearPending.value = y
    return
  }
  const a = yearPending.value
  const [lo, hi] = a <= y ? [a, y] : [y, a]
  emit('update:range', {
    startDate: toIsoDay(lo, 1, 1),
    endDate: toIsoDay(hi + 1, 1, 1),
  })
  yearPending.value = null
}

const isYearPending = (y: number) => yearPending.value === y

const isYearSelected = (y: number): boolean => {
  const s = selectedStartCD.value
  if (!s) return false
  if (y < s.year) return false
  const e = selectedEndCD.value
  if (!e) return true
  return y < e.year
}

const yearVariant = (y: number): 'default' | 'outline' =>
  isYearPending(y) || isYearSelected(y) ? 'default' : 'outline'

const yearBtnClass = (y: number) =>
  isYearSelected(y) && !isYearPending(y)
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : ''

const onClearEnd = () => emit('clear-end')
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="justify-start gap-2 font-normal"
        data-testid="date-range-trigger"
      >
        <CalendarRange class="size-4" />
        {{ triggerLabel }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <RangeCalendarRoot
        v-if="viewMode === 'day'"
        v-slot="{ grid, weekDays }"
        :model-value="dayRange"
        class="p-3"
        @update:model-value="onDayRange"
      >
        <RangeCalendarHeader>
          <RangeCalendarPrevButton />
          <button
            type="button"
            data-testid="calendar-heading-toggle"
            class="text-sm font-medium hover:bg-accent rounded-md px-2 py-1"
            @click="cycleView"
          >
            <RangeCalendarHeading />
          </button>
          <RangeCalendarNextButton />
        </RangeCalendarHeader>

        <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
          <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
            <RangeCalendarGridHead>
              <RangeCalendarGridRow>
                <RangeCalendarHeadCell v-for="day in weekDays" :key="day">
                  {{ day }}
                </RangeCalendarHeadCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridHead>
            <RangeCalendarGridBody>
              <RangeCalendarGridRow
                v-for="(weekDates, idx) in month.rows"
                :key="`week-${idx}`"
                class="mt-2 w-full"
              >
                <RangeCalendarCell
                  v-for="weekDate in weekDates"
                  :key="weekDate.toString()"
                  :date="weekDate"
                >
                  <RangeCalendarCellTrigger :day="weekDate" :month="month.value" />
                </RangeCalendarCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridBody>
          </RangeCalendarGrid>
        </div>
      </RangeCalendarRoot>

      <div v-else-if="viewMode === 'month'" class="p-3">
        <div class="flex items-center justify-between mb-3">
          <Button type="button" variant="ghost" size="icon" @click="monthYear--">
            <ChevronLeft class="size-4" />
          </Button>
          <button
            type="button"
            data-testid="calendar-heading-toggle"
            class="text-sm font-medium hover:bg-accent rounded-md px-2 py-1"
            @click="cycleView"
          >
            {{ monthYear }}
          </button>
          <Button type="button" variant="ghost" size="icon" @click="monthYear++">
            <ChevronRight class="size-4" />
          </Button>
        </div>
        <div class="grid grid-cols-3 gap-2 w-[14rem]">
          <Button
            v-for="(label, i) in MONTHS"
            :key="label"
            type="button"
            :variant="monthVariant(i + 1)"
            :class="monthBtnClass(i + 1)"
            size="sm"
            :data-testid="`month-${i + 1}`"
            @click="onPickMonth(i + 1)"
          >
            {{ label }}
          </Button>
        </div>
        <p v-if="monthPending" class="text-xs text-muted-foreground mt-2">
          Pick end month…
        </p>
      </div>

      <div v-else class="p-3">
        <div class="flex items-center justify-between mb-3">
          <Button type="button" variant="ghost" size="icon" @click="yearPageStart -= 12">
            <ChevronLeft class="size-4" />
          </Button>
          <button
            type="button"
            data-testid="calendar-heading-toggle"
            class="text-sm font-medium hover:bg-accent rounded-md px-2 py-1"
            @click="cycleView"
          >
            {{ yearGrid[0] }} – {{ yearGrid[11] }}
          </button>
          <Button type="button" variant="ghost" size="icon" @click="yearPageStart += 12">
            <ChevronRight class="size-4" />
          </Button>
        </div>
        <div class="grid grid-cols-3 gap-2 w-[14rem]">
          <Button
            v-for="y in yearGrid"
            :key="y"
            type="button"
            :variant="yearVariant(y)"
            :class="yearBtnClass(y)"
            size="sm"
            :data-testid="`year-${y}`"
            @click="onPickYear(y)"
          >
            {{ y }}
          </Button>
        </div>
        <p v-if="yearPending !== null" class="text-xs text-muted-foreground mt-2">
          Pick end year…
        </p>
      </div>

      <div class="flex justify-end gap-2 p-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="clear-end-date"
          @click="onClearEnd"
        >
          Set as ongoing
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
