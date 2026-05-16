<script setup lang="ts">
import { Button, type ButtonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Variant = NonNullable<ButtonVariants['variant']>

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmVariant?: Variant
  }>(),
  {
    description: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmVariant: 'destructive',
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const close = () => emit('update:open', false)
const onConfirm = () => {
  emit('confirm')
  close()
}
const onOpenChange = (value: boolean) => emit('update:open', value)
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ props.title }}</DialogTitle>
        <DialogDescription v-if="props.description">{{ props.description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="close">{{ props.cancelLabel }}</Button>
        <Button :variant="props.confirmVariant" @click="onConfirm">{{ props.confirmLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
