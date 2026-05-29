import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import VariableRatesEditor from '@/components/forms/VariableRatesEditor.vue'
import type { RatePeriod } from '@/core/schemas/growth'

const findBodyButton = (label: string) =>
  Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )

beforeEach(() => {
  document.body.innerHTML = ''
})

const mountEditor = (modelValue: RatePeriod[] = []) =>
  mount(VariableRatesEditor, {
    props: { modelValue },
    attachTo: document.body,
  })

describe('VariableRatesEditor', () => {
  it('renders an empty state when there are no rates', () => {
    const wrapper = mountEditor([])
    expect(wrapper.findAll('[data-testid="rate-row"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="add-rate"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders one row per existing rate', () => {
    const rates: RatePeriod[] = [
      { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-06-30T00:00:00.000Z', rate: 0.08 },
      { startDate: '2026-07-01T00:00:00.000Z', rate: 0.072 },
    ]
    const wrapper = mountEditor(rates)
    expect(wrapper.findAll('[data-testid="rate-row"]')).toHaveLength(2)
    wrapper.unmount()
  })

  it('emits a new row when add button clicked', async () => {
    const wrapper = mountEditor([])
    await wrapper.find('[data-testid="add-rate"]').trigger('click')
    await flushPromises()
    const emits = wrapper.emitted('update:modelValue') as RatePeriod[][][] | undefined
    expect(emits).toBeTruthy()
    const last = emits?.[emits.length - 1]?.[0]
    expect(last).toHaveLength(1)
    expect(last?.[0].rate).toBe(0)
    expect(typeof last?.[0].startDate).toBe('string')
    wrapper.unmount()
  })

  it('emits updated rate when rate input changes', async () => {
    const rates: RatePeriod[] = [{ startDate: '2026-01-01T00:00:00.000Z', rate: 0.08 }]
    const wrapper = mountEditor(rates)
    const rateInput = wrapper.find('[data-testid="rate-input"]')
    await rateInput.setValue('0.09')
    await flushPromises()
    const emits = wrapper.emitted('update:modelValue') as RatePeriod[][][] | undefined
    const last = emits?.[emits.length - 1]?.[0]
    expect(last?.[0].rate).toBe(0.09)
    wrapper.unmount()
  })

  it('renders the trigger with formatted start and ongoing when no end', () => {
    const rates: RatePeriod[] = [{ startDate: '2026-01-01T00:00:00.000Z', rate: 0.05 }]
    const wrapper = mountEditor(rates)
    const trigger = wrapper.find('[data-testid="date-range-trigger"]')
    const text = trigger.text()
    expect(text).toMatch(/2026/)
    expect(text).toContain('ongoing')
    wrapper.unmount()
  })

  it('renders the trigger with both dates when end is set', () => {
    const rates: RatePeriod[] = [
      { startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-06-30T00:00:00.000Z', rate: 0.08 },
    ]
    const wrapper = mountEditor(rates)
    const text = wrapper.find('[data-testid="date-range-trigger"]').text()
    expect(text).not.toContain('ongoing')
    expect(text).toContain('→')
    wrapper.unmount()
  })

  it('does not emit on remove until confirmation accepted', async () => {
    const rates: RatePeriod[] = [
      { startDate: '2026-01-01T00:00:00.000Z', rate: 0.08 },
      { startDate: '2026-07-01T00:00:00.000Z', rate: 0.072 },
    ]
    const wrapper = mountEditor(rates)
    const removeBtns = wrapper.findAll('[data-testid="remove-rate"]')
    await removeBtns[0].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    findBodyButton('Remove rate')!.click()
    await flushPromises()
    const emits = wrapper.emitted('update:modelValue') as RatePeriod[][][] | undefined
    const last = emits?.[emits.length - 1]?.[0]
    expect(last).toHaveLength(1)
    expect(last?.[0].rate).toBe(0.072)
    wrapper.unmount()
  })

  it('does not emit when remove cancelled', async () => {
    const rates: RatePeriod[] = [{ startDate: '2026-01-01T00:00:00.000Z', rate: 0.08 }]
    const wrapper = mountEditor(rates)
    await wrapper.find('[data-testid="remove-rate"]').trigger('click')
    await flushPromises()
    findBodyButton('Cancel')!.click()
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    wrapper.unmount()
  })
})
