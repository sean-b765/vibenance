<script setup lang="ts">
import { LayoutDashboard, TableProperties, Settings as SettingsIcon, ChartLine } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { SidebarProps } from '@/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

const props = defineProps<SidebarProps>()
const route = useRoute()

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/scenarios', label: 'Scenarios', icon: ChartLine, match: (p: string) => p.startsWith('/scenarios') },
  { to: '/entities', label: 'Entities', icon: TableProperties, match: (p: string) => p === '/entities' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, match: (p: string) => p === '/settings' },
]

const isActive = computed(() => (matcher: (p: string) => boolean) => matcher(route.path))
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <div class="px-3 py-2">
        <div class="text-base font-semibold">Finance Model</div>
        <div class="text-xs text-muted-foreground">Local-first projections</div>
      </div>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in nav" :key="item.to">
              <SidebarMenuButton as-child :is-active="isActive(item.match)">
                <RouterLink :to="item.to">
                  <component :is="item.icon" class="size-4" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
