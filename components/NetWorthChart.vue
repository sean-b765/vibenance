<script setup lang="ts">
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

const bucketed = computed(() =>
  props.lines.map((l) => ({
    name: l.name,
    colour: l.colour,
    points: bucket(l.points, props.bucketKind),
  })),
)

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
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
    textStyle: { fontSize: 12 },
  },
  grid: { left: 56, right: 16, top: 32, bottom: 56 },
  xAxis: {
    type: 'time',
    axisLabel: {
      formatter: (v: number) => formatDate(new Date(v).toISOString()),
      fontSize: 11,
    },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (v: number) => formatCompactCurrency(v),
      fontSize: 11,
    },
    splitLine: { lineStyle: { color: '#e5e5e5' } },
  },
  dataZoom: [
    { type: 'inside' },
    { type: 'slider', height: 24, bottom: 8 },
  ],
  series: bucketed.value.map((l) => ({
    name: l.name,
    type: 'line',
    showSymbol: false,
    smooth: false,
    sampling: 'lttb',
    lineStyle: { color: l.colour, width: 2 },
    itemStyle: { color: l.colour },
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
