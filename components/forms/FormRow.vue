<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <label class="flex flex-col gap-1 text-sm">
    <span class="text-xs uppercase text-neutral-500">{{ label }}</span>
    <slot />
  </label>
</template>
