import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import DateRangePopover from '@/components/forms/DateRangePopover.vue'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('DateRangePopover month-view selection', () => {
  it('highlights months in middle year of a multi-year range', async () => {
    const wrapper = mount(DateRangePopover, {
      props: {
        startDate: '2016-01-01T00:00:00.000Z',
        endDate: '2027-01-01T00:00:00.000Z',
      },
      attachTo: document.body,
    })
    await nextTick()
    const trigger = wrapper.find('[data-testid="date-range-trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    const vm = wrapper.vm as unknown as {
      viewMode: string
      monthYear: number
      isMonthSelected: (m: number) => boolean
    }
    vm.viewMode = 'month'
    vm.monthYear = 2025
    await nextTick()
    await flushPromises()
    expect(vm.isMonthSelected(1)).toBe(true)
    expect(vm.isMonthSelected(6)).toBe(true)
    expect(vm.isMonthSelected(12)).toBe(true)

    const btn = document.body.querySelector('[data-testid="month-6"]') as HTMLElement | null
    expect(btn).not.toBeNull()
    expect(btn?.className).toContain('bg-emerald-600')
    wrapper.unmount()
  })
})
