import { z } from "zod"

export const tareaSchema = z.object({
  codigo: z.coerce.number().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  elementoTipoId: z.string().optional(),
  nivelId: z.string().optional(),
  planillaId: z.string().optional(),
  procedimientoId: z.string().optional(),
  prioridad: z.coerce.number().min(1).max(4),
  horasBase: z.coerce.number().min(0),
  impactoBase: z.coerce.number().min(0),
})

export type TareaFormValues = z.infer<typeof tareaSchema>
