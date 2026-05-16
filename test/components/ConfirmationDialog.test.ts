import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ConfirmationDialog from '@/components/ConfirmationDialog.vue'

beforeEach(() => {
  document.body.innerHTML = ''
})

const mountOpen = async (props: Record<string, unknown> = {}) => {
  const wrapper = mount(ConfirmationDialog, {
    props: { open: true, title: 'Reset?', description: 'Cannot undo.', ...props },
    attachTo: document.body,
  })
  await flushPromises()
  await nextTick()
  return wrapper
}

const findButton = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )

describe('ConfirmationDialog', () => {
  it('renders title and description when open', async () => {
    const wrapper = await mountOpen()
    const body = document.body.textContent ?? ''
    expect(body).toContain('Reset?')
    expect(body).toContain('Cannot undo.')
    wrapper.unmount()
  })

  it('emits confirm and update:open=false on confirm click', async () => {
    const wrapper = await mountOpen()
    findButton('Confirm')!.click()
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeTruthy()
    const updates = wrapper.emitted('update:open') as unknown[][] | undefined
    expect(updates?.some((e) => e[0] === false)).toBe(true)
    wrapper.unmount()
  })

  it('emits update:open=false on cancel click without confirm', async () => {
    const wrapper = await mountOpen()
    findButton('Cancel')!.click()
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeFalsy()
    const updates = wrapper.emitted('update:open') as unknown[][] | undefined
    expect(updates?.some((e) => e[0] === false)).toBe(true)
    wrapper.unmount()
  })

  it('honours custom confirm/cancel labels', async () => {
    const wrapper = await mountOpen({ confirmLabel: 'Yes, reset', cancelLabel: 'Keep data' })
    const body = document.body.textContent ?? ''
    expect(body).toContain('Yes, reset')
    expect(body).toContain('Keep data')
    wrapper.unmount()
  })
})
