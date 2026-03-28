import { z } from "zod"

export const procedimientoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  observaciones: z.string().max(500).optional().default(""),
  nombreArchivoId: z.string().max(100).optional().default(""),
})

export type ProcedimientoFormValues = z.infer<typeof procedimientoSchema>
