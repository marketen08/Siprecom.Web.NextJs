import { z } from "zod"

export const campoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  etiqueta: z.string().optional(),
  tipoDato: z.coerce.number().min(1).max(7),
  unidad: z.string().optional(),
  descripcion: z.string().optional(),
})

export type CampoFormValues = z.infer<typeof campoSchema>
