import { z } from "zod"

export const campoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  etiqueta: z.string().min(1, "La etiqueta es requerida"),
  // 6 (Firma) y 7 (Adjunto) excluidos: ya no son tipos de campo. Resto: 1..5, 8.
  tipoDato: z.number().int().min(1).max(8).refine((v) => v !== 6 && v !== 7, { message: "Tipo no válido" }),
  unidad: z.string().optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().optional(),
})

export type CampoFormValues = z.infer<typeof campoSchema>
