import { z } from "zod"

export const areaSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  descripcion: z.string().max(1000).optional().nullable(),
})

export type AreaFormValues = z.infer<typeof areaSchema>
