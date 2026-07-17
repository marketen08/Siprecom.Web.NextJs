import { z } from "zod"

const FAMILIA_METADATA_TG_VALUES = [0, 1, 2] as const
const TIPO_CERTIFICADO_VALUES = [1, 2, 3, 4] as const

export const elementoTipoSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es requerido").max(200),
    especialidadId: z.string().min(1, "La especialidad es requerida"),
    horasAdicionalesDefault: z.number().min(0),
    impactoFactorDefault: z.number().min(0),
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
    // Capa 1 — puerta gruesa. Se aplica a tipos físicos.
    permiteAgrupar: z.boolean(),
    // Capa 2 — restricción granular por sintético. Vacío = fallback permisivo.
    tiposFisicosPermitidosIds: z.array(z.string()).default([]),
  })
  .refine(
    (v) => !v.esSintetico || v.certificadoQueAlimenta !== null,
    {
      path: ["certificadoQueAlimenta"],
      message: "Elegí a qué certificado alimenta este tipo sintético",
    },
  )

export type ElementoTipoFormInput = z.input<typeof elementoTipoSchema>
export type ElementoTipoFormValues = z.output<typeof elementoTipoSchema>
