<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { renderWarning } from '@/core/i18n/warnings'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { Warning } from '@/core/validation/warnings'

defineProps<{ warnings: Warning[] }>()
</script>

<template>
  <span v-if="warnings.length > 0" class="inline-flex items-center gap-1">
    <Tooltip>
      <TooltipTrigger as-child>
        <Badge variant="outline" class="gap-1 border-orange-500 text-orange-600">
          <AlertTriangle class="size-3" />
          <span>{{ warnings.length }}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <ul class="space-y-0.5">
          <li v-for="(w, i) in warnings" :key="`${w.code}-${i}`">
            {{ renderWarning(w.entityName, w.code, w.messageParams) }}
          </li>
        </ul>
      </TooltipContent>
    </Tooltip>
  </span>
</template>
