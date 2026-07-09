import { z } from "zod"

export const tareaSchema = z
  .object({
    codigo: z.number().min(1, "El código es requerido"),
    nombre: z.string().min(1, "El nombre es requerido"),
    elementoTipoId: z.string().min(1, "El tipo de elemento es requerido"),
    nivelId: z.string().min(1, "El nivel es requerido"),
    planillaId: z.string().min(1, "La planilla es requerida"),
    procedimientoId: z.string().optional(),
    prioridad: z.number().min(1).max(4),
    horasBase: z.number().min(0),
    impactoBase: z.number().min(0),
    tipoAsignacion: z.number().int().min(1).max(3),
    // Nullable string: null = sin precedencia, string = id de la tarea precedente.
    tareaPrecedenteId: z.string().nullable(),
    lagDias: z.number().int().min(0).max(365),
    // ── Preservación ──
    esPreservacion: z.boolean(),
    periodoSemanas: z
      .number()
      .int()
      .min(1, "Mínimo 1 semana")
      .max(520, "Máximo 520 semanas (10 años)")
      .nullable(),
    calculoProximaFecha: z.number().int().min(1).max(2),
  })
  .superRefine((data, ctx) => {
    if (data.esPreservacion && (data.periodoSemanas == null || data.periodoSemanas <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodoSemanas"],
        message: "El período en semanas es obligatorio cuando la tarea es de preservación.",
      })
    }
  })

export type TareaFormValues = z.infer<typeof tareaSchema>
