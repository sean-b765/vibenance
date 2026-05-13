import { z } from 'zod'

export const themePreferenceSchema = z.enum(['system', 'light', 'dark'])

export const taxBracketSchema = z.object({
  upTo: z.number().nullable(),
  rate: z.number(),
})

export const taxConfigSchema = z.object({
  jurisdiction: z.string().min(1),
  year: z.number().int(),
  brackets: z.array(taxBracketSchema),
})

export const settingsSchema = z.object({
  currency: z.string().min(1),
  inflationRate: z.number(),
  taxConfig: taxConfigSchema,
  theme: themePreferenceSchema,
})

export type ThemePreference = z.infer<typeof themePreferenceSchema>
export type TaxBracket = z.infer<typeof taxBracketSchema>
export type TaxConfig = z.infer<typeof taxConfigSchema>
export type Settings = z.infer<typeof settingsSchema>
