<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-xs uppercase text-muted-foreground">{{ label }}</span>
    <slot />
  </label>
</template>
