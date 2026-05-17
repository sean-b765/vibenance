<script setup lang="ts">
import { Pencil, X } from 'lucide-vue-next'
import { computed, nextTick, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const props = withDefaults(
	defineProps<{
		modelValue: string
		inputClass?: string
		labelClass?: string
		ariaLabel?: string
	}>(),
	{ inputClass: '', labelClass: '', ariaLabel: 'Edit' },
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const isEditing = ref(false)
const draft = ref('')
const cancelled = ref(false)
const inputRef = ref<{ $el?: HTMLInputElement } | null>(null)

const enterEdit = async () => {
	draft.value = props.modelValue
	cancelled.value = false
	isEditing.value = true
	await nextTick()
	const el = inputRef.value?.$el
	el?.focus()
}

const commit = () => {
	if (cancelled.value) {
		isEditing.value = false
		return
	}
	const trimmed = draft.value.trim()
	if (trimmed && trimmed !== props.modelValue) {
		emit('update:modelValue', trimmed)
	}
	isEditing.value = false
}

const cancel = () => {
	cancelled.value = true
	isEditing.value = false
}

const onEnter = (e: KeyboardEvent) => {
	;(e.target as HTMLInputElement).blur()
}

const mirrorText = computed(() => draft.value || props.modelValue || ' ')
</script>

<template>
	<div class="inline-flex items-center gap-1 min-h-9">
		<template v-if="!isEditing">
			<span
				data-testid="inline-edit-label"
				:class="cn('px-2 py-1 cursor-text select-none', labelClass)"
				@dblclick="enterEdit"
			>
				{{ modelValue }}
			</span>
			<Button
				variant="ghost"
				size="icon"
				class="size-5 cursor-pointer"
				:aria-label="ariaLabel"
				title="Edit"
				@click="enterEdit"
			>
				<Pencil class="size-3" />
			</Button>
		</template>
		<template v-else>
			<span class="relative inline-grid items-center">
				<span
					aria-hidden="true"
					:class="
						cn(
							'invisible whitespace-pre px-2 py-1 col-start-1 row-start-1',
							inputClass,
						)
					"
				>{{ mirrorText }}</span>
				<Input
					ref="inputRef"
					v-model="draft"
					size="1"
					:class="
						cn(
							'border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 px-2 py-1 bg-transparent min-w-0 w-full col-start-1 row-start-1',
							inputClass,
						)
					"
					@keydown.enter="onEnter"
					@keydown.esc="cancel"
					@blur="commit"
				/>
			</span>
			<Button
				variant="ghost"
				size="icon"
				class="size-5 cursor-pointer"
				aria-label="Cancel"
				title="Cancel"
				@mousedown.prevent="cancel"
			>
				<X class="size-3" />
			</Button>
		</template>
	</div>
</template>
