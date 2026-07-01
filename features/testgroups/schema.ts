import { z } from "zod"
import { TIPO_TEST_GROUP } from "./types"

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
  tipo: z.union([z.literal(TIPO_TEST_GROUP.PRESSURE), z.literal(TIPO_TEST_GROUP.BASIC_FUNCTION)]),
  ...baseFields,
})

export const testGroupUpdateSchema = z.object(baseFields)

export type TestGroupCreateFormInput = z.input<typeof testGroupCreateSchema>
export type TestGroupCreateFormValues = z.output<typeof testGroupCreateSchema>
export type TestGroupUpdateFormValues = z.output<typeof testGroupUpdateSchema>
