import { z } from "zod"

export const elementoTipoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  especialidad: z.string().max(450).optional().default(""),
  horasBaseDefault: z.number().min(0),
  impactoBaseDefault: z.number().min(0),
  horasAdicionalesDefault: z.number().min(0),
  impactoFactorDefault: z.number().min(0),
})

export type ElementoTipoFormValues = z.infer<typeof elementoTipoSchema>
