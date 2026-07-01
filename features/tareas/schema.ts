import { z } from "zod"

export const tareaSchema = z.object({
  codigo: z.number().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  elementoTipoId: z.string().min(1, "El tipo de elemento es requerido"),
  nivelId: z.string().min(1, "El nivel es requerido"),
  planillaId: z.string().min(1, "La planilla es requerida"),
  procedimientoId: z.string().optional(),
  prioridad: z.number().min(1).max(4),
  horasBase: z.number().min(0),
  impactoBase: z.number().min(0),
  tipoAsignacion: z.number().int().min(1).max(3),
})

export type TareaFormValues = z.infer<typeof tareaSchema>
