<script setup lang="ts">
defineProps<{ label: string; required?: boolean; error?: string }>()
</script>

<template>
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-xs uppercase text-muted-foreground">
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </span>
    <slot />
    <span v-if="error" class="text-xs text-destructive">{{ error }}</span>
  </label>
</template>
