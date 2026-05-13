import { z } from 'zod'
import { assetSchema } from '@/core/schemas/asset'
import { expenseSchema } from '@/core/schemas/expense'
import { hexColourSchema } from '@/core/schemas/tag'
import { incomeSchema } from '@/core/schemas/income'
import { liabilitySchema } from '@/core/schemas/liability'
import { transferSchema } from '@/core/schemas/transfer'

export const scenarioEntitiesSchema = z.object({
  assets: z.array(assetSchema),
  liabilities: z.array(liabilitySchema),
  incomes: z.array(incomeSchema),
  expenses: z.array(expenseSchema),
  transfers: z.array(transferSchema),
})

export const scenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  colour: hexColourSchema,
  favourite: z.boolean(),
  horizonYears: z.number().int().positive(),
  inflationRate: z.number(),
  entities: scenarioEntitiesSchema,
  notes: z.string().optional(),
})

export type ScenarioEntities = z.infer<typeof scenarioEntitiesSchema>
export type Scenario = z.infer<typeof scenarioSchema>
