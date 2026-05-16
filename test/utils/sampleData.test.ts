import { describe, expect, it } from 'vitest'
import { scenarioSchema } from '@/core/schemas/scenario'
import { tagSchema } from '@/core/schemas/tag'
import {
  buildExtraSampleScenario,
  buildSampleScenario,
  systemTags,
} from '@/utils/sampleData'

describe('systemTags', () => {
  it('returns the five system tags required by REQUIREMENTS §3.2', () => {
    const tags = systemTags()
    expect(tags.map((t) => t.name).sort()).toEqual(
      ['Asset', 'Expense', 'Income', 'Liability', 'Transfer'],
    )
  })

  it('marks every tag as a system tag', () => {
    for (const tag of systemTags()) {
      expect(tag.system).toBe(true)
    }
  })

  it('produces tags that validate against the schema', () => {
    for (const tag of systemTags()) {
      expect(tagSchema.parse(tag)).toEqual(tag)
    }
  })

  it('assigns unique IDs', () => {
    const ids = systemTags().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('buildSampleScenario', () => {
  const scenario = buildSampleScenario()

  it('validates against the scenario schema', () => {
    expect(() => scenarioSchema.parse(scenario)).not.toThrow()
  })

  it('matches the AU mid-career sample dataset in §10', () => {
    expect(scenario.name).toBe('Base')
    expect(scenario.favourite).toBe(true)
    expect(scenario.horizonYears).toBe(30)
    expect(scenario.inflationRate).toBe(0.025)
  })

  it('includes the expected entity counts', () => {
    expect(scenario.entities.assets).toHaveLength(5)
    expect(scenario.entities.liabilities).toHaveLength(2)
    expect(scenario.entities.incomes).toHaveLength(1)
    expect(scenario.entities.expenses).toHaveLength(4)
    expect(scenario.entities.transfers).toHaveLength(0)
  })

  it('links the offset account to the mortgage', () => {
    const offset = scenario.entities.assets.find((a) => a.type === 'account_offset')
    const mortgage = scenario.entities.liabilities.find((l) => l.type === 'mortgage')
    expect(offset).toBeDefined()
    expect(mortgage).toBeDefined()
    expect(offset?.linkedLiabilityId).toBe(mortgage?.id)
  })

  it('seeds each entity with at least one snapshot', () => {
    for (const a of scenario.entities.assets) {
      expect(a.snapshots.length).toBeGreaterThan(0)
    }
    for (const l of scenario.entities.liabilities) {
      expect(l.snapshots.length).toBeGreaterThan(0)
    }
  })

  it('produces a fresh ID and snapshots on each call', () => {
    const a = buildSampleScenario()
    const b = buildSampleScenario()
    expect(a.id).not.toBe(b.id)
    expect(a.entities.assets[0]?.id).not.toBe(b.entities.assets[0]?.id)
  })
})

describe('buildExtraSampleScenario', () => {
  it('validates against the scenario schema', () => {
    expect(() => scenarioSchema.parse(buildExtraSampleScenario())).not.toThrow()
  })

  it('mirrors §10: same base entities, mortgage repayment bumped by $500/mo', () => {
    const base = buildSampleScenario()
    const extra = buildExtraSampleScenario()
    const baseMortgage = base.entities.liabilities.find((l) => l.type === 'mortgage')
    const extraMortgage = extra.entities.liabilities.find((l) => l.type === 'mortgage')
    expect(extra.name).toBe('Pay extra $500/mo on mortgage')
    expect(extraMortgage?.repayment).toBe((baseMortgage?.repayment ?? 0) + 500)
  })

  it('is not flagged as favourite', () => {
    expect(buildExtraSampleScenario().favourite).toBe(false)
  })

  it('has a distinct ID from base', () => {
    expect(buildExtraSampleScenario().id).not.toBe(buildSampleScenario().id)
  })
})
