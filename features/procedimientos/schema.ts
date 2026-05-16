import { z } from "zod"

// El archivo PDF se sube vía endpoint separado (multipart). El form sólo valida los
// campos de texto que viajan como JSON al CRUD principal.
export const procedimientoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  observaciones: z.string().max(500).optional().default(""),
})

export type ProcedimientoFormInput = z.input<typeof procedimientoSchema>
export type ProcedimientoFormValues = z.output<typeof procedimientoSchema>
