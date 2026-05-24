<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import GlobalWarningsDrawer from '@/components/GlobalWarningsDrawer.vue'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <span class="text-sm text-muted-foreground">Personal Finance Modelling</span>
      </header>
      <main class="flex-1 p-6 overflow-auto">
        <RouterView />
      </main>
    </SidebarInset>
    <GlobalWarningsDrawer />
  </SidebarProvider>
</template>
