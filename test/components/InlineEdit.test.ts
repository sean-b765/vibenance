import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import InlineEdit from '@/components/inputs/InlineEdit.vue'

const mountInline = (props: Record<string, unknown> = {}) =>
  mount(InlineEdit, {
    props: { modelValue: 'Hello', ...props },
    attachTo: document.body,
  })

describe('InlineEdit', () => {
  it('renders text in label mode by default', () => {
    const wrapper = mountInline()
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows edit (pencil) icon button in label mode', () => {
    const wrapper = mountInline()
    const btn = wrapper.find('button[aria-label="Edit"]')
    expect(btn.exists()).toBe(true)
    wrapper.unmount()
  })

  it('clicking edit icon enters edit mode with input focused', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('Hello')
    wrapper.unmount()
  })

  it('double-clicking label text enters edit mode', async () => {
    const wrapper = mountInline()
    await wrapper.find('[data-testid="inline-edit-label"]').trigger('dblclick')
    await nextTick()
    expect(wrapper.find('input').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows cancel (x) button in edit mode, not edit', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    expect(wrapper.find('button[aria-label="Cancel"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Edit"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('emits update:modelValue on blur with trimmed value', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('  World  ')
    await input.trigger('blur')
    await flushPromises()
    const emits = wrapper.emitted('update:modelValue') as unknown[][] | undefined
    expect(emits?.[emits.length - 1]?.[0]).toBe('World')
    wrapper.unmount()
  })

  it('exits edit mode on blur', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    await wrapper.find('input').trigger('blur')
    await flushPromises()
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not emit when value unchanged', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    await wrapper.find('input').trigger('blur')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    wrapper.unmount()
  })

  it('does not emit when blank after trim', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('   ')
    await input.trigger('blur')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    wrapper.unmount()
  })

  it('cancel button discards changes', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('Discarded')
    await wrapper.find('button[aria-label="Cancel"]').trigger('mousedown')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('escape key cancels without emitting', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('Nope')
    await input.trigger('keydown.esc')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('enter key commits value', async () => {
    const wrapper = mountInline()
    await wrapper.find('button[aria-label="Edit"]').trigger('click')
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('Saved')
    await input.trigger('keydown.enter')
    await flushPromises()
    const emits = wrapper.emitted('update:modelValue') as unknown[][] | undefined
    expect(emits?.[emits.length - 1]?.[0]).toBe('Saved')
    wrapper.unmount()
  })
})
