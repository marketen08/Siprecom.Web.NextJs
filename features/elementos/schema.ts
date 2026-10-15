import { z } from "zod"

export const elementoSchema = z
  .object({
    tag: z.string().min(1, "El TAG es requerido"),
    nombre: z.string().min(1, "El nombre es requerido"),
    elementoTipoId: z.string().min(1, "El tipo de elemento es requerido"),
    prioridad: z.number().int().min(1).max(4),
    sistemaId: z.string().min(1, "El sistema es requerido"),
    subSistemaId: z.string().min(1, "El subsistema es requerido"),
    horasAdicionales: z.number().min(0),
    impactoFactor: z.number().min(0),
    pid: z.string().optional().default(""),
    observaciones: z.string(),
    // TestGroups F2
    moduloId: z.string().nullable().optional().default(null),
    areaIds: z.array(z.string()).optional().default([]),
    /** null = heredar de ElementoTipo, true/false = override explícito. */
    permiteAgrupar: z.boolean().nullable().optional().default(null),
    // ── Baja operativa (preservación) ──
    // Fecha ISO "YYYY-MM-DD" o null. Motivo obligatorio si hay fecha.
    fechaBajaOperativa: z.string().nullable().optional().default(null),
    motivoBajaOperativa: z
      .string()
      .max(500, "El motivo no puede exceder 500 caracteres")
      .nullable()
      .optional()
      .default(null),
  })
  .superRefine((data, ctx) => {
    if (data.fechaBajaOperativa && !data.motivoBajaOperativa?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoBajaOperativa"],
        message: "El motivo es obligatorio cuando se registra una baja operativa.",
      })
    }
  })

export type ElementoFormInput = z.input<typeof elementoSchema>
export type ElementoFormValues = z.output<typeof elementoSchema>
