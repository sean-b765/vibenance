<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import { warningMessage } from '@/core/i18n/warnings'
import type { Warning } from '@/core/validation/warnings'

defineProps<{ warning: Warning }>()
</script>

<template>
  <div class="flex items-start gap-1.5 text-xs mt-1 text-amber-600">
    <AlertTriangle class="size-3.5 mt-0.5 shrink-0" />
    <span>{{ warningMessage(warning.code) }}</span>
  </div>
</template>
