import { describe, expect, it } from 'vitest'
import { parseBundle, serializeBundle, SCHEMA_VERSION } from '@/core/io/json'
import type { Settings } from '@/core/schemas/settings'
import { buildSampleScenario } from '@/utils/sampleData'

const sampleSettings = (): Settings => ({
  currency: 'AUD',
  inflationRate: 0.025,
  taxConfig: { jurisdiction: 'AU', year: 2026, brackets: [{ upTo: null, rate: 0.45 }] },
})

describe('json import/export', () => {
  it('serializeBundle round-trips through parseBundle', () => {
    const scenario = buildSampleScenario()
    const input = {
      scenarios: [scenario],
      tags: [{ id: '0192f3a0-0000-7000-8000-000000000001', name: 'Salary', colour: '#10b981', system: false }],
      settings: sampleSettings(),
    }
    const text = serializeBundle(input)
    const parsed = parseBundle(text)
    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.scenarios).toHaveLength(1)
    expect(parsed.scenarios[0]?.id).toBe(scenario.id)
    expect(parsed.tags[0]?.name).toBe('Salary')
    expect(parsed.settings.currency).toBe('AUD')
  })

  it('serializeBundle produces a valid datetime stamp', () => {
    const text = serializeBundle({ scenarios: [], tags: [], settings: sampleSettings() })
    const parsed = parseBundle(text)
    expect(Date.parse(parsed.exportedAt)).not.toBeNaN()
  })

  it('parseBundle throws on invalid JSON', () => {
    expect(() => parseBundle('not json')).toThrow()
  })

  it('parseBundle throws when schema does not match', () => {
    expect(() => parseBundle(JSON.stringify({ version: 1, foo: 'bar' }))).toThrow()
  })

  it('parseBundle throws on incompatible version', () => {
    const text = JSON.stringify({
      version: 999,
      exportedAt: new Date().toISOString(),
      scenarios: [],
      tags: [],
      settings: sampleSettings(),
    })
    expect(() => parseBundle(text)).toThrow(/version/i)
  })
})
