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
    tipoAsignacion: z.number().int(),
    // Nullable string: null = sin precedencia, string = id de la tarea precedente.
    tareaPrecedenteId: z.string().nullable(),
    lagDias: z.number().int().min(0).max(365),
    // Tarea puntual (ad-hoc): no la expanden los generadores, se asigna eligiendo
    // elementos a mano desde el tab "Puntuales" de Coordinación.
    esAdHoc: z.boolean(),
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
    // Mismo criterio que el backend: preservación se excluye del avance y las
    // puntuales cuentan, así que la combinación es contradictoria.
    if (data.esAdHoc && data.esPreservacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["esAdHoc"],
        message: "Una tarea no puede ser puntual y de preservación a la vez.",
      })
    }
    if (data.esPreservacion && (data.periodoSemanas == null || data.periodoSemanas <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodoSemanas"],
        message: "El período en semanas es obligatorio cuando la tarea es de preservación.",
      })
    }
  })

export type TareaFormValues = z.infer<typeof tareaSchema>
