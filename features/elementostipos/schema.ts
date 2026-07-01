import { z } from "zod"

export const elementoTipoSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200),
  especialidadId: z.string().min(1, "La especialidad es requerida"),
  horasAdicionalesDefault: z.number().min(0),
  impactoFactorDefault: z.number().min(0),
  permiteAgruparEnTestPack: z.boolean(),
  permiteAgruparEnBasicFunction: z.boolean(),
})

export type ElementoTipoFormInput = z.input<typeof elementoTipoSchema>
export type ElementoTipoFormValues = z.output<typeof elementoTipoSchema>
