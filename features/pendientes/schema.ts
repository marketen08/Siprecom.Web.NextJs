import { z } from "zod"

export const pendienteCreateSchema = z.object({
  // Wizard de descripción — las 5 dimensiones son requeridas y arman
  // (junto al catálogo maestro) la Descripción y la Categoría.
  nivelId: z.string().min(1, "Nivel requerido"),
  especialidadId: z.string().min(1, "Especialidad requerida"),
  tipoId: z.string().min(1, "Tipo requerido"),
  accionId: z.string().min(1, "Acción requerida"),
  motivoId: z.string().min(1, "Motivo requerido"),

  // Salen del wizard/catálogo pero quedan editables.
  categoriaId: z.string().min(1, "Categoría requerida"),
  descripcion: z.string().min(1, "Descripción requerida").max(2000),

  responsableId: z.string().min(1, "Responsable requerido"),
  fechaCierreEstimado: z.string().min(1, "Fecha de cierre estimada requerida"),

  // Avanzado (colapsable).
  prioridad: z.number().int().min(1).max(4),

  // Localización.
  subSistemaId: z.string().optional().nullable(),
  elementoId: z.string().optional().nullable(),
  pid: z.string().max(500).optional().nullable(),
})

export type PendienteFormValues = z.infer<typeof pendienteCreateSchema>
