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
  // CSV de property names para el matching de TAG en archivos NWD/RVT importados.
  // Opcional — si está vacío, el extractor usa los defaults Plant 3D.
  apsTagProperties: z.string().max(500).optional().nullable(),
  proyectoPlantillaId: z.string().optional(),
  clonar: proyectoClonOptionsSchema.optional(),
})

export type ProyectoFormInput = z.input<typeof proyectoSchema>
export type ProyectoFormValues = z.output<typeof proyectoSchema>
export type ProyectoClonOptions = z.output<typeof proyectoClonOptionsSchema>
