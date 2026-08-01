import { z } from "zod"

/**
 * Schema del form de pendiente. Es una factory porque el requerimiento
 * de Elemento depende del feature flag PENDIENTE_ELEMENTO_REQUERIDO del
 * proyecto activo — se resuelve en runtime.
 *
 * Sistema y Subsistema son siempre requeridos (decisión 2026-07 para
 * trazabilidad + certificados). Sistema vive en el form solo para poder
 * mostrar el error en el campo correcto — al backend solo se envía subSistemaId.
 *
 * IMPORTANTE: los campos "requeridos" son `z.string().min(1, ...)` sin nullable.
 * El form tiene que asegurar que los inputs pasen "" (string vacío) en vez de
 * `null` cuando no hay selección — sino Zod tira el mensaje crudo
 * "expected string, received null" en vez del custom.
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

    // Salen del catálogo (readonly). La descripción puede editarse manualmente
    // si el proyecto tiene activo PENDIENTES_DESCRIPCION_MANUAL y el user tildó
    // el checkbox "Modificar descripción manualmente".
    categoriaId: z.string().min(1, "Categoría requerida"),
    descripcion: z.string().min(1, "Descripción requerida").max(2000),
    descripcionManual: z.boolean().optional(),

    responsableId: z.string().min(1, "Responsable requerido"),
    fechaCierreEstimado: z.string().min(1, "Fecha de cierre estimada requerida"),

    // Avanzado (colapsable).
    prioridad: z.number().int().min(1).max(4),

    // Localización — Sistema y Subsistema requeridos; Elemento según flag del proyecto.
    // Sistema se envía en el form solo para validar el UI; el backend solo consume subSistemaId.
    sistemaId: z.string().min(1, "Sistema requerido"),
    subSistemaId: z.string().min(1, "Subsistema requerido"),
    // Cuando es requerido usamos nullable + refine para poder emitir el custom
    // message tanto para null como para "" (los Combobox pueden emitir cualquiera
    // de los dos según el flow — dejar sin nullable rechaza null con el mensaje
    // crudo "expected string, received null").
    elementoId: elementoRequerido
      ? z.string().nullable().refine((v) => !!v && v.length > 0, "Elemento requerido")
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
