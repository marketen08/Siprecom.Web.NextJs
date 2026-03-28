import { z } from "zod"

export const proyectoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  clienteId: z.string().min(1, "El cliente es requerido"),
  contratistaId: z.string().min(1, "El contratista es requerido"),
  estado: z.number().int().min(1).max(7),
  observaciones: z.string().min(1, "Las observaciones son requeridas").max(500),
  proyectoPlantillaId: z.string().optional(),
})

export type ProyectoFormValues = z.infer<typeof proyectoSchema>
