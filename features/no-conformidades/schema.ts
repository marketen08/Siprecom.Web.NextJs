import { z } from "zod"

/**
 * Schemas de los formularios del módulo de Calidad.
 *
 * Nota sobre los campos requeridos: van como `z.string().min(1, ...)` sin
 * nullable, igual que en Pendientes. El form tiene que pasar "" y no `null`
 * cuando no hay selección — sino Zod tira el mensaje crudo
 * "expected string, received null" en vez del custom.
 */

export const noConformidadCreateSchema = z
  .object({
    tipoId: z.string().min(1, "Tipo requerido"),
    titulo: z.string().min(1, "Título requerido").max(300, "Máximo 300 caracteres"),
    severidad: z.coerce.number().int().min(1).max(2),

    grupoAfectadoId: z.string().min(1, "Área afectada requerida"),
    grupoSeguimientoId: z.string().min(1, "Área de seguimiento requerida"),

    motivoId: z.string().optional(),
    subSistemaId: z.string().optional(),
    elementoId: z.string().optional(),
    especialidadId: z.string().optional(),

    fechaDeteccion: z.string().optional(),
    fechaCompromiso: z.string().optional(),
    detectadoPorId: z.string().optional(),

    descripcion: z.string().min(1, "Describí el hallazgo"),
    pendienteOrigenId: z.string().optional(),
  })
  // El circuito se apoya en que un área ejecuta y la otra controla. Si son la
  // misma, el control se diluye — el backend lo rechaza igual, pero avisar acá
  // evita el viaje.
  .refine((d) => d.grupoAfectadoId !== d.grupoSeguimientoId, {
    path: ["grupoSeguimientoId"],
    message: "El área de seguimiento debe ser distinta de la afectada",
  })

export type NoConformidadCreateInput = z.infer<typeof noConformidadCreateSchema>

export const noConformidadUpdateSchema = z
  .object({
    titulo: z.string().min(1, "Título requerido").max(300),
    severidad: z.coerce.number().int().min(1).max(2),
    grupoAfectadoId: z.string().min(1, "Área afectada requerida"),
    grupoSeguimientoId: z.string().min(1, "Área de seguimiento requerida"),
    motivoId: z.string().optional(),
    subSistemaId: z.string().optional(),
    elementoId: z.string().optional(),
    especialidadId: z.string().optional(),
    fechaCompromiso: z.string().optional(),
  })
  .refine((d) => d.grupoAfectadoId !== d.grupoSeguimientoId, {
    path: ["grupoSeguimientoId"],
    message: "El área de seguimiento debe ser distinta de la afectada",
  })

export type NoConformidadUpdateInput = z.infer<typeof noConformidadUpdateSchema>

// ── Etapas del workflow ────────────────────────────────────────────────────

export const accionInmediataSchema = z.object({
  accionInmediata: z.string().min(1, "Describí la acción inmediata"),
  comentario: z.string().optional(),
})

export const investigacionSchema = z.object({
  causaRaiz: z.string().min(1, "La causa raíz es obligatoria"),
  accionCorrectiva: z.string().min(1, "La acción correctiva es obligatoria"),
  planMejora: z.string().optional(),
  comentario: z.string().optional(),
})

export const objetivoEficaciaSchema = z.object({
  objetivoEficacia: z.string().min(1, "Definí qué se va a medir"),
  fechaEvaluacionEficacia: z.string().min(1, "Fecha de evaluación requerida"),
  comentario: z.string().optional(),
})

export const resultadoEficaciaSchema = z.object({
  resultadoEficacia: z.string().min(1, "Cargá el resultado de la medición"),
  fueEficaz: z.boolean(),
  comentario: z.string().optional(),
})

/** Rechazo y cancelación: el motivo es obligatorio, lo exige el backend. */
export const motivoObligatorioSchema = z.object({
  comentario: z.string().min(1, "El motivo es obligatorio"),
})

/** Transiciones que solo llevan observación opcional. */
export const transicionSchema = z.object({
  comentario: z.string().optional(),
})

export type AccionInmediataInput = z.infer<typeof accionInmediataSchema>
export type InvestigacionInput = z.infer<typeof investigacionSchema>
export type ObjetivoEficaciaInput = z.infer<typeof objetivoEficaciaSchema>
export type ResultadoEficaciaInput = z.infer<typeof resultadoEficaciaSchema>
