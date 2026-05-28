<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'
import VChart from 'vue-echarts'
import type { BucketKind, SeriesPoint } from '@/core/engine/series'
import { bucket } from '@/core/engine/series'
import { registerEcharts } from '@/utils/echarts'
import { formatCompactCurrency, formatCurrency, formatDate } from '@/utils/format'

registerEcharts()

type LineSpec = {
  name: string
  colour: string
  points: SeriesPoint[]
  area?: boolean
  width?: number
}

const props = defineProps<{
  lines: LineSpec[]
  bucketKind: BucketKind
  height?: string
}>()

const emit = defineEmits<{
  (e: 'hover', date: string | null): void
}>()

const onAxisPointer = (event: { axesInfo?: { value: number }[] }) => {
  const v = event.axesInfo?.[0]?.value
  if (typeof v !== 'number') {
    emit('hover', null)
    return
  }
  emit('hover', new Date(v).toISOString())
}

const onMouseOut = () => emit('hover', null)

const mode = useColorMode()
const isDark = computed(() => mode.value === 'dark')
const axisColor = computed(() => (isDark.value ? '#a1a1aa' : '#525252'))
const splitColor = computed(() => (isDark.value ? '#27272a' : '#e5e5e5'))

const bucketed = computed(() =>
  props.lines.map((l) => ({
    name: l.name,
    colour: l.colour,
    area: l.area ?? false,
    width: l.width ?? 2,
    points: bucket(l.points, props.bucketKind),
  })),
)

const option = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: { color: axisColor.value },
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark.value ? '#18181b' : '#ffffff',
    borderColor: isDark.value ? '#27272a' : '#e5e5e5',
    textStyle: { color: isDark.value ? '#e5e5e5' : '#171717' },
    formatter: (params: { axisValueLabel: string; seriesName: string; value: [string, number]; color: string }[]) => {
      const date = params[0]?.axisValueLabel ?? ''
      const rows = params
        .map(
          (p) =>
            `<div style="display:flex;justify-content:space-between;gap:12px;">
               <span><span style="display:inline-block;width:8px;height:8px;background:${p.color};border-radius:50%;margin-right:6px;"></span>${p.seriesName}</span>
               <strong>${formatCurrency(p.value[1])}</strong>
             </div>`,
        )
        .join('')
      return `<div style="font-weight:600;margin-bottom:4px;">${date}</div>${rows}`
    },
  },
  legend: {
    top: 0,
    textStyle: { fontSize: 12, color: axisColor.value },
    icon: 'roundRect'
  },
  grid: { left: 56, right: 16, top: 52, bottom: 66 },
  xAxis: {
    type: 'time',
    axisLine: { lineStyle: { color: splitColor.value } },
    axisLabel: {
      formatter: (v: number) => formatDate(new Date(v).toISOString()),
      fontSize: 11,
      color: axisColor.value,
    },
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: splitColor.value } },
    axisLabel: {
      formatter: (v: number) => formatCompactCurrency(v),
      fontSize: 11,
      color: axisColor.value,
    },
    splitLine: { lineStyle: { color: splitColor.value } },
  },
  dataZoom: [
    { type: 'inside' },
    {
      type: 'slider',
      height: 24,
      bottom: 8,
      backgroundColor: 'rgba(0,0,0,0)',
      borderColor: 'rgba(0,0,0,0)',
      handleStyle: {
        color: 'rgba(255,255,255,1)'
      },
      moveHandleSize: 1,
      dataBackground: {
        lineStyle: {
          color: '#000'
        }
      }
    },
  ],
  series: bucketed.value.map((l) => ({
    name: l.name,
    type: 'line',
    showSymbol: false,
    smooth: false,
    sampling: 'lttb',
    z: l.area ? 1 : 2,
    lineStyle: { color: l.colour, width: l.width },
    itemStyle: { color: l.colour },
    ...(l.area ? { areaStyle: { color: l.colour, opacity: 0.25 } } : {}),
    data: l.points.map((p) => [p.date, p.value]),
  })),
}))
</script>

<template>
  <VChart
    :option="option"
    autoresize
    :style="{ width: '100%', height: height ?? '420px' }"
    @updateAxisPointer="onAxisPointer"
    @globalout="onMouseOut"
  />
</template>
