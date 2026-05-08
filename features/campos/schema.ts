import { z } from "zod"

export const campoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  etiqueta: z.string().min(1, "La etiqueta es requerida"),
  tipoDato: z.number().min(1).max(8),
  unidad: z.string().optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().optional(),
})

export type CampoFormValues = z.infer<typeof campoSchema>
