import { z } from "zod"

/**
 * Schema del form de pendiente. Es una factory porque el requerimiento
 * de Elemento depende del feature flag PENDIENTE_ELEMENTO_REQUERIDO del
 * proyecto activo — se resuelve en runtime.
 *
 * Sistema y Subsistema son siempre requeridos (decisión 2026-07 para
 * trazabilidad + certificados). El Sistema no vive en el form (solo filtra
 * el select de subsistemas), así que solo validamos subSistemaId.
 */
export function makePendienteCreateSchema(elementoRequerido: boolean) {
  return z.object({
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

    // Localización — Subsistema siempre requerido; Elemento según flag del proyecto.
    subSistemaId: z.string().min(1, "Subsistema requerido"),
    elementoId: elementoRequerido
      ? z.string().min(1, "Elemento requerido")
      : z.string().optional().nullable(),
    pid: z.string().max(500).optional().nullable(),
  })
}

/**
 * Schema legacy con Elemento opcional. Usar solo cuando no hay contexto
 * del proyecto (ej. pruebas). En el form real usar `makePendienteCreateSchema`.
 */
export const pendienteCreateSchema = makePendienteCreateSchema(false)

export type PendienteFormValues = z.infer<typeof pendienteCreateSchema>
