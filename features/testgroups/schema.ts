import { z } from "zod"

const baseFields = {
  subSistemaId: z.string().min(1, "El subsistema es requerido"),
  codigo: z.string().min(1, "El código es requerido").max(50),
  nombre: z.string().max(200).optional().default(""),
  descripcion: z.string().max(1000).optional().nullable().default(null),
}

export const testGroupCreateSchema = z.object({
  // Rediseño 2026-07: el "tipo" del pack se define eligiendo un ElementoTipo
  // sintético del catálogo. La metadata del encabezado (Presion/Fluido/etc.)
  // se captura en el Registro de encabezado usando la Planilla configurada
  // en el ElementoTipo — ya no viaja en este DTO.
  elementoTipoSinteticoId: z.string().min(1, "Elegí el tipo sintético del pack"),
  ...baseFields,
})

export const testGroupUpdateSchema = z.object(baseFields)

export type TestGroupCreateFormInput = z.input<typeof testGroupCreateSchema>
export type TestGroupCreateFormValues = z.output<typeof testGroupCreateSchema>
export type TestGroupUpdateFormValues = z.output<typeof testGroupUpdateSchema>
