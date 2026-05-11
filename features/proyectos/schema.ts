import { z } from "zod"

export const proyectoClonOptionsSchema = z.object({
  tareas: z.boolean().default(true),
  flags: z.boolean().default(true),
  firmas: z.boolean().default(true),
  acceso: z.boolean().default(true),
  estructura: z.boolean().default(false),
})

export const proyectoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  clienteId: z.string().min(1, "El cliente es requerido"),
  contratistaId: z.string().min(1, "El contratista es requerido"),
  estado: z.number().int().min(1).max(7),
  observaciones: z.string().min(1, "Las observaciones son requeridas").max(500),
  proyectoPlantillaId: z.string().optional(),
  clonar: proyectoClonOptionsSchema.optional(),
})

export type ProyectoFormValues = z.infer<typeof proyectoSchema>
export type ProyectoClonOptions = z.infer<typeof proyectoClonOptionsSchema>
