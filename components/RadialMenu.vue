<script setup lang="ts">
import { Ellipsis, X } from 'lucide-vue-next'
import { computed, type Component, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type RadialMenuItem = {
  tooltipText?: string
  icon?: Component | null
  text?: string
  items?: RadialMenuItem[]
  onSelect?: () => void
}

const props = defineProps<{
  items: RadialMenuItem[]
  innerRadius?: number
  outerRadius?: number
}>()

const open = ref(false)
const path = ref<number[]>([])
const rootRef = ref<HTMLElement | null>(null)
const hoverIdx = ref<number | null>(null)

const currentItems = computed<RadialMenuItem[]>(() => {
  let list = props.items
  for (const idx of path.value) {
    const next = list[idx]?.items
    if (!next || next.length === 0) return list
    list = next
  }
  return list
})

const close = () => {
  open.value = false
  path.value = []
  hoverIdx.value = null
}

const onTriggerClick = () => {
  if (open.value) {
    close()
    return
  }
  if (currentItems.value.length === 1) {
    const only = currentItems.value[0]!
    if (only.items && only.items.length > 0) {
      open.value = true
      path.value = [...path.value, 0]
      return
    }
    only.onSelect?.()
    return
  }
  open.value = true
}

const onItemClick = (idx: number) => {
  const item = currentItems.value[idx]
  if (!item) return
  if (item.items && item.items.length > 0) {
    path.value = [...path.value, idx]
    hoverIdx.value = null
    return
  }
  item.onSelect?.()
  close()
}

const onRootFocusOut = (e: FocusEvent) => {
  const next = e.relatedTarget as Node | null
  if (next && rootRef.value && rootRef.value.contains(next)) return
  close()
}

const innerR = computed(() => props.innerRadius ?? 40)
const outerR = computed(() => props.outerRadius ?? 150)
const svgSize = computed(() => outerR.value * 2 + 8)

const textRotation = (midDeg: number) => {
  // SVG rotates clockwise from +x; radial direction in SVG = user midDeg + 180.
  let a = midDeg + 180
  a = (((a + 180) % 360) + 360) % 360 - 180
  if (a > 90) a -= 180
  if (a < -90) a += 180
  return a
}

const START_DEG = 0
const END_DEG = 90

// User-angle convention: left=0deg, top=90deg. Map to SVG local coords centered at (svgSize/2, svgSize/2).
const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180
  const cx = svgSize.value / 2
  const cy = svgSize.value / 2
  return { x: cx + -Math.cos(rad) * r, y: cy + -Math.sin(rad) * r }
}

type Segment = {
  path: string
  centroidX: number
  centroidY: number
  midDeg: number
  item: RadialMenuItem
  idx: number
}

const segments = computed<Segment[]>(() => {
  const items = currentItems.value
  if (items.length === 0) return []
  const span = END_DEG - START_DEG
  const step = span / items.length
  return items.map((item, idx) => {
    const a1 = START_DEG + step * idx
    const a2 = a1 + step
    const p1 = polar(a1, innerR.value)
    const p2 = polar(a1, outerR.value)
    const p3 = polar(a2, outerR.value)
    const p4 = polar(a2, innerR.value)
    // a2 > a1 in user convention rotates counter-clockwise in user space, which maps to
    // clockwise in screen y-down coords (since we negate both axes) -> sweep flag for outer arc = 1, inner reverse = 0.
    const d = [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${outerR.value} ${outerR.value} 0 0 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${innerR.value} ${innerR.value} 0 0 0 ${p1.x} ${p1.y}`,
      'Z',
    ].join(' ')
    const midDeg = (a1 + a2) / 2
    const midR = (innerR.value + outerR.value) / 2
    const c = polar(midDeg, midR)
    return { path: d, centroidX: c.x, centroidY: c.y, midDeg, item, idx }
  })
})

const triggerDisplay = computed(() => {
  if (currentItems.value.length === 1) {
    const only = currentItems.value[0]!
    return { icon: only.icon ?? null, text: only.text ?? '', tooltip: only.tooltipText ?? '' }
  }
  return { icon: Ellipsis as Component, text: '', tooltip: open.value ? 'Cancel' : 'Quick controls' }
})

const activeTooltip = computed(() => {
  if (hoverIdx.value === null) return null
  const seg = segments.value[hoverIdx.value]
  return seg?.item.tooltipText ?? null
})
</script>

<template>
  <div
    v-if="items.length > 0"
    ref="rootRef"
    data-radial-root
    class="fixed bottom-6 right-6 z-50"
    tabindex="-1"
    @focusout="onRootFocusOut"
  >
    <div class="relative">
      <svg
        v-if="open"
        :width="svgSize"
        :height="svgSize"
        :viewBox="`0 0 ${svgSize} ${svgSize}`"
        class="absolute pointer-events-none"
        :style="{ left: `calc(50% - ${svgSize / 2}px)`, top: `calc(50% - ${svgSize / 2}px)` }"
      >
        <g
          v-for="seg in segments"
          :key="seg.idx"
          data-radial-item
          class="pointer-events-auto cursor-pointer"
          @click="onItemClick(seg.idx)"
          @mouseenter="hoverIdx = seg.idx"
          @mouseleave="hoverIdx = (hoverIdx === seg.idx ? null : hoverIdx)"
        >
          <path
            :d="seg.path"
            :class="[
              'transition-colors',
              hoverIdx === seg.idx
                ? 'fill-emerald-500/60 stroke-emerald-700/60'
                : 'fill-emerald-600/60 stroke-emerald-800/60',
            ]"
            stroke-width="1"
          />
          <foreignObject
            :x="seg.centroidX - (outerR - innerR - 20) / 2"
            :y="seg.centroidY - 14"
            :width="outerR - innerR - 20"
            height="28"
            class="pointer-events-none"
            :transform="`rotate(${textRotation(seg.midDeg)} ${seg.centroidX} ${seg.centroidY})`"
          >
            <div class="w-full h-full flex items-center justify-center text-white text-sm font-semibold gap-1.5 whitespace-nowrap">
              <component :is="seg.item.icon" v-if="seg.item.icon" class="size-4 shrink-0" />
              <span v-if="seg.item.text">{{ seg.item.text }}</span>
            </div>
          </foreignObject>
        </g>
      </svg>

      <div
        v-if="open && activeTooltip"
        class="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover text-popover-foreground text-xs shadow border border-border whitespace-nowrap pointer-events-none"
      >
        {{ activeTooltip }}
      </div>

      <TooltipProvider :delay-duration="100">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              data-radial-trigger
              :aria-label="triggerDisplay.tooltip"
              class="relative size-12 rounded-full shadow-lg bg-emerald-600/10 hover:bg-emerald-700/10 text-white p-0 flex items-center justify-center backdrop-blur-lg border border-emerald-300/30"
              @click="onTriggerClick"
            >
              <component :is="open ? X : triggerDisplay.icon" v-if="triggerDisplay.icon" class="size-5" />
              <span v-if="triggerDisplay.text" class="text-xs font-semibold">
                {{ triggerDisplay.text }}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent v-if="!open && triggerDisplay.tooltip" side="top">
            {{ triggerDisplay.tooltip }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
