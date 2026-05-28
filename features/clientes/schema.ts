import { z } from "zod"

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  esContratista: z.boolean(),
})

export type ClienteFormValues = z.infer<typeof clienteSchema>
