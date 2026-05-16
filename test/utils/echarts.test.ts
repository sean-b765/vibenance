import { describe, expect, it } from 'vitest'
import { registerEcharts } from '@/utils/echarts'

describe('registerEcharts', () => {
  it('runs without throwing on first call', () => {
    expect(() => registerEcharts()).not.toThrow()
  })

  it('is idempotent across multiple calls', () => {
    expect(() => {
      registerEcharts()
      registerEcharts()
      registerEcharts()
    }).not.toThrow()
  })
})
