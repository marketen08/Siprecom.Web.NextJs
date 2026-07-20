import { z } from "zod"

export const pidArchivoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(100),
  nombre: z.string().min(1, "El nombre es requerido").max(500),
  descripcion: z.string().max(2000).optional(),
  subSistemaIds: z.array(z.string()),
})

export type PidArchivoFormValues = z.infer<typeof pidArchivoSchema>
