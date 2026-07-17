import { z } from "zod"

// Valores válidos de FamiliaMetadataTG (espejo del enum backend).
const FAMILIA_METADATA_TG_VALUES = [0, 1, 2] as const

// Valores válidos de TipoCertificado (espejo del enum backend).
const TIPO_CERTIFICADO_VALUES = [1, 2, 3, 4] as const

export const elementoTipoSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(200),
    especialidadId: z.string().min(1, "La especialidad es requerida"),
    horasAdicionalesDefault: z.number().min(0),
    impactoFactorDefault: z.number().min(0),
    permiteAgruparEnTestPack: z.boolean(),
    permiteAgruparEnBasicFunction: z.boolean(),
    esSintetico: z.boolean(),
    certificadoQueAlimenta: z
      .union([
        z.literal(TIPO_CERTIFICADO_VALUES[0]),
        z.literal(TIPO_CERTIFICADO_VALUES[1]),
        z.literal(TIPO_CERTIFICADO_VALUES[2]),
        z.literal(TIPO_CERTIFICADO_VALUES[3]),
      ])
      .nullable(),
    familiaMetadataTG: z.union([
      z.literal(FAMILIA_METADATA_TG_VALUES[0]),
      z.literal(FAMILIA_METADATA_TG_VALUES[1]),
      z.literal(FAMILIA_METADATA_TG_VALUES[2]),
    ]),
  })
  .refine(
    // Si NO es sintético, no tiene sentido tener certificado ni familia poblados —
    // los normalizamos a null/NINGUNA silenciosamente. El refine solo valida el
    // caso donde el usuario activó sintético: le pedimos definir el certificado.
    (v) => !v.esSintetico || v.certificadoQueAlimenta !== null,
    {
      path: ["certificadoQueAlimenta"],
      message: "Elegí a qué certificado alimenta este tipo sintético",
    },
  )

export type ElementoTipoFormInput = z.input<typeof elementoTipoSchema>
export type ElementoTipoFormValues = z.output<typeof elementoTipoSchema>
