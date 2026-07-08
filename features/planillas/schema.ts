import { z } from "zod"

export const planillaSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
  observaciones: z.string().optional(),
  version: z.string().optional(),
  requiereFirma: z.boolean().optional(),
  permiteAdjuntos: z.boolean().optional(),
  generaPdfFinal: z.boolean().optional(),
  // 0 = Vertical, 1 = Horizontal (apaisado)
  orientacionPdf: z.union([z.literal(0), z.literal(1)]).optional(),
  // Especialidad opcional: string ID o null = "Sin especialidad (genérica)".
  especialidadId: z.string().nullable().optional(),
})

export type PlanillaFormValues = z.infer<typeof planillaSchema>
