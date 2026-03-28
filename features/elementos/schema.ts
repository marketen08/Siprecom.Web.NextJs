import { z } from "zod"

export const elementoSchema = z.object({
  tag: z.string().min(1, "El TAG es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  elementoTipoId: z.string().min(1, "El tipo de elemento es requerido"),
  prioridad: z.number().int().min(1).max(4),
  sistemaId: z.string().min(1, "El sistema es requerido"),
  subSistemaId: z.string().min(1, "El subsistema es requerido"),
  horasAdicionales: z.number().min(0),
  impactoFactor: z.number().min(0),
  pid: z.string().min(1, "El PID es requerido"),
  testpack: z.string().min(1, "El testpack es requerido"),
  observaciones: z.string(),
})

export type ElementoFormValues = z.infer<typeof elementoSchema>
