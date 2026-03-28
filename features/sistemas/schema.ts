import { z } from "zod"

export const sistemaSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(100),
  nombre: z.string().min(1, "El nombre es requerido").max(200),
})

export type SistemaFormValues = z.infer<typeof sistemaSchema>
