<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useScenariosStore } from '@/stores/scenarios'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Ellipsis } from 'lucide-vue-next'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'

const scenarios = useScenariosStore()
const newName = ref('')
const deleteConfirmationOpen = ref(false)
const selectedMenuId = ref<string | undefined>(undefined)
const confirmDelete = () => {
  if (!selectedMenuId.value) return

  scenarios.remove(selectedMenuId.value)
}

const createScenario = () => {
	const name = newName.value.trim()
	scenarios.create(name || 'New Scenario')
	newName.value = ''
}
</script>

<template>
	<div class="space-y-6">
		<header class="flex items-center justify-between">
			<h2 class="text-2xl font-semibold">Scenarios</h2>
			<div class="flex gap-2">
				<Input
					v-model="newName"
          class="hidden sm:block"
					placeholder="New scenario name"
					@keyup.enter="createScenario"
				/>
				<Button @click="createScenario">Create</Button>
			</div>
		</header>

		<p v-if="!scenarios.hasData" class="text-muted-foreground text-sm">
			No scenarios yet. Load sample data from the dashboard.
		</p>

		<ul class="divide-y rounded-md border bg-card">
			<li
				v-for="s in scenarios.scenarios"
				:key="s.id"
				class="p-4 flex items-center gap-3"
			>
				<span class="w-3 h-3 rounded-full" :style="{ background: s.colour }" />
				<div class="flex-1">
					<RouterLink
						:to="`/scenarios/${s.id}`"
						class="font-medium hover:underline"
					>
						{{ s.name }}
					</RouterLink>
					<div class="text-xs text-muted-foreground">
						Horizon {{ s.horizonYears }}y · Inflation
						{{ (s.inflationRate * 100).toFixed(1) }}%
					</div>
				</div>
        <DropdownMenu>
          <DropdownMenuTrigger class="block sm:hidden">
            <Button size="sm" variant="outline">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @click="scenarios.toggleFavourite(s.id)">
					    {{ s.favourite ? '★ Favourite' : '☆ Favourite' }}
            </DropdownMenuItem>
            <DropdownMenuItem @click="scenarios.duplicate(s.id)">
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem class="text-destructive hover:text-destructive" @click="selectedMenuId = s.id; deleteConfirmationOpen = true">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
				<Button
          class="hidden sm:block"
					size="sm"
					variant="ghost"
					@click="scenarios.toggleFavourite(s.id)"
				>
					{{ s.favourite ? '★ Favourite' : '☆ Favourite' }}
				</Button>
				<Button
          class="hidden sm:block"
          size="sm"
          variant="ghost"
          @click="scenarios.duplicate(s.id)">
          Duplicate
        </Button>
				<Button
					v-if="s.name !== 'Base'"
					size="sm"
					variant="ghost"
					class="hidden sm:block text-destructive hover:text-destructive"
					@click="selectedMenuId = s.id; deleteConfirmationOpen = true"
				>
					Delete
				</Button>
			</li>
		</ul>
	</div>

  <ConfirmationDialog
    v-model:open="deleteConfirmationOpen"
    title="Delete Scenario?"
    description="This will delete the scenario. Are you sure?"
    confirm-label="Delete"
    @confirm="confirmDelete"
  />
</template>
