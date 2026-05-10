import { z } from "zod"

export const subsistemaSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(100),
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  sistemaId: z.string().min(1, "El sistema es requerido"),
  // Las fechas planificadas se manejan aparte vía SubSistemaNivel.
})

export type SubSistemaFormValues = z.infer<typeof subsistemaSchema>
