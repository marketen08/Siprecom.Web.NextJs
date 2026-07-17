import { z } from "zod"

const baseFields = {
  subSistemaId: z.string().min(1, "El subsistema es requerido"),
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().max(200).optional().default(""),
  descripcion: z.string().max(1000).optional().nullable().default(null),
  presion: z.number().nullable().optional().default(null),
  fluido: z.string().max(100).nullable().optional().default(null),
  pidReferencia: z.string().max(200).nullable().optional().default(null),
  metodoPrueba: z.number().nullable().optional().default(null),
  limitesBateria: z.string().max(1000).nullable().optional().default(null),
  tipoPruebaFuncional: z.number().nullable().optional().default(null),
  alcanceFuncional: z.string().max(1000).nullable().optional().default(null),
}

export const testGroupCreateSchema = z.object({
  // Rediseño 2026-07: el "tipo" del pack se define eligiendo un ElementoTipo
  // sintético del catálogo. La familia (Pressure / Basic Function / Ninguna)
  // se deriva de ese tipo.
  elementoTipoSinteticoId: z.string().min(1, "Elegí el tipo sintético del pack"),
  ...baseFields,
})

export const testGroupUpdateSchema = z.object(baseFields)

export type TestGroupCreateFormInput = z.input<typeof testGroupCreateSchema>
export type TestGroupCreateFormValues = z.output<typeof testGroupCreateSchema>
export type TestGroupUpdateFormValues = z.output<typeof testGroupUpdateSchema>
