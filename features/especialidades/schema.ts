import { z } from "zod"

export const especialidadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido").max(200),
  codigo: z.string().trim().max(20).optional().default(""),
  color: z.string()
    .trim()
    .regex(/^(#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?)?$/i, "Color hex inválido (ej: #2563eb)")
    .max(9)
    .optional()
    .default(""),
})

export type EspecialidadFormValues = z.infer<typeof especialidadSchema>
