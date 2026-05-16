<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/scenarios', label: 'Scenarios' },
  { to: '/entities', label: 'Entities' },
  { to: '/settings', label: 'Settings' },
]
</script>

<template>
  <div class="min-h-screen flex bg-neutral-50 text-neutral-900">
    <aside class="w-56 border-r border-neutral-200 bg-white p-4 flex flex-col gap-1">
      <h1 class="text-lg font-semibold mb-4">Finance Model</h1>
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="px-3 py-2 rounded text-sm hover:bg-neutral-100"
        active-class="bg-neutral-100 font-medium"
      >
        {{ item.label }}
      </RouterLink>
    </aside>
    <main class="flex-1 p-8 overflow-auto">
      <RouterView />
    </main>
  </div>
</template>
