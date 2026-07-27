import { z } from "zod"

export const pendienteCreateSchema = z.object({
  categoriaId: z.string().min(1, "Categoría requerida"),
  tipoId: z.string().min(1, "Tipo requerido"),
  responsableId: z.string().min(1, "Responsable requerido"),
  descripcion: z.string().min(1, "Descripción requerida").max(2000),
  prioridad: z.number().int().min(1).max(4),
  fechaCierreEstimado: z.string().min(1, "Fecha de cierre estimada requerida"),
  subSistemaId: z.string().optional().nullable(),
  elementoId: z.string().optional().nullable(),
  especialidadId: z.string().optional().nullable(),
  pid: z.string().max(500).optional().nullable(),
  circuito: z.string().max(500).optional().nullable(),
  // Wizard de descripción (opcionales).
  nivelId: z.string().optional().nullable(),
  accionId: z.string().optional().nullable(),
  motivoId: z.string().optional().nullable(),
})

export type PendienteFormValues = z.infer<typeof pendienteCreateSchema>
