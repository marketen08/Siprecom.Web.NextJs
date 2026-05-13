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
  pid: z.string().optional().default(""),
  testpack: z.string().optional().default(""),
  observaciones: z.string(),
})

export type ElementoFormInput = z.input<typeof elementoSchema>
export type ElementoFormValues = z.output<typeof elementoSchema>
