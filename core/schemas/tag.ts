import { z } from 'zod'

export const hexColourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #1a2b3c')

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  colour: hexColourSchema,
  system: z.boolean(),
})

export type Tag = z.infer<typeof tagSchema>
