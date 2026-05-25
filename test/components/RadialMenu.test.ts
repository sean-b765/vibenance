import { mount } from '@vue/test-utils'
import { Eye, Plus } from 'lucide-vue-next'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import RadialMenu from '@/components/RadialMenu.vue'

describe('RadialMenu', () => {
  it('renders nothing when items is empty', () => {
    const wrapper = mount(RadialMenu, { props: { items: [] } })
    expect(wrapper.find('[data-radial-root]').exists()).toBe(false)
  })

  it('with a single item, shows that item icon/text on the button and fires onSelect on click', async () => {
    const onSelect = vi.fn()
    const wrapper = mount(RadialMenu, {
      props: {
        items: [{ tooltipText: 'Toggle', icon: Eye, onSelect }],
      },
    })
    const trigger = wrapper.get('[data-radial-trigger]')
    expect(trigger.html()).toContain('svg')
    await trigger.trigger('click')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('with a single item containing text, renders the text on the button', () => {
    const wrapper = mount(RadialMenu, {
      props: { items: [{ text: '5yr', onSelect: () => { } }] },
    })
    expect(wrapper.get('[data-radial-trigger]').text()).toContain('5yr')
  })

  it('with multiple items, shows Ellipsis icon and opens radial items on click', async () => {
    const wrapper = mount(RadialMenu, {
      props: {
        items: [
          { tooltipText: 'Toggle', icon: Eye, onSelect: () => { } },
          { tooltipText: 'Add', icon: Plus, onSelect: () => { } },
        ],
      },
    })
    expect(wrapper.findAll('[data-radial-item]').length).toBe(0)
    await wrapper.get('[data-radial-trigger]').trigger('click')
    await nextTick()
    expect(wrapper.findAll('[data-radial-item]').length).toBe(2)
  })

  it('clicking trigger while open closes the menu', async () => {
    const wrapper = mount(RadialMenu, {
      props: {
        items: [
          { tooltipText: 'A', icon: Eye, onSelect: () => { } },
          { tooltipText: 'B', icon: Plus, onSelect: () => { } },
        ],
      },
    })
    const trigger = wrapper.get('[data-radial-trigger]')
    await trigger.trigger('click')
    expect(wrapper.findAll('[data-radial-item]').length).toBe(2)
    await trigger.trigger('click')
    expect(wrapper.findAll('[data-radial-item]').length).toBe(0)
  })

  it('clicking a leaf item fires onSelect and closes the menu', async () => {
    const onA = vi.fn()
    const wrapper = mount(RadialMenu, {
      props: {
        items: [
          { tooltipText: 'A', icon: Eye, onSelect: onA },
          { tooltipText: 'B', icon: Plus, onSelect: () => { } },
        ],
      },
    })
    await wrapper.get('[data-radial-trigger]').trigger('click')
    await wrapper.findAll('[data-radial-item]')[0]!.trigger('click')
    expect(onA).toHaveBeenCalled()
    expect(wrapper.findAll('[data-radial-item]').length).toBe(0)
  })

  it('clicking an item with children navigates to those children', async () => {
    const onYr1 = vi.fn()
    const wrapper = mount(RadialMenu, {
      props: {
        items: [
          { tooltipText: 'A', icon: Eye, onSelect: () => { } },
          {
            tooltipText: 'Horizon',
            text: '5yr',
            items: [
              { text: '1yr', onSelect: onYr1 },
              { text: '3yr', onSelect: () => { } },
            ],
          },
        ],
      },
    })
    await wrapper.get('[data-radial-trigger]').trigger('click')
    const items = wrapper.findAll('[data-radial-item]')
    expect(items.length).toBe(2)
    await items[1]!.trigger('click')
    await nextTick()
    const subItems = wrapper.findAll('[data-radial-item]')
    expect(subItems.length).toBe(2)
    expect(subItems[0]!.text()).toContain('1yr')
    await subItems[0]!.trigger('click')
    expect(onYr1).toHaveBeenCalled()
  })

  it('blur on the root closes the menu', async () => {
    const wrapper = mount(RadialMenu, {
      attachTo: document.body,
      props: {
        items: [
          { tooltipText: 'A', icon: Eye, onSelect: () => { } },
          { tooltipText: 'B', icon: Plus, onSelect: () => { } },
        ],
      },
    })
    await wrapper.get('[data-radial-trigger]').trigger('click')
    expect(wrapper.findAll('[data-radial-item]').length).toBe(2)
    await wrapper.get('[data-radial-root]').trigger('focusout', { relatedTarget: null })
    await nextTick()
    expect(wrapper.findAll('[data-radial-item]').length).toBe(0)
    wrapper.unmount()
  })
})
