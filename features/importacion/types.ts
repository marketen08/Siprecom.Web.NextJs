export interface ImportEntidadResumen {
  creates: number
  updates: number
  deletes: number
  total: number
}

export interface ImportError {
  hoja: string
  filaExcel: number
  columna: string | null
  mensaje: string
}

export interface ImportPreview {
  sistemas: ImportEntidadResumen
  subsistemas: ImportEntidadResumen
  elementos: ImportEntidadResumen
  /** Paquetes de prueba (TestGroups) creados/actualizados/eliminados desde la hoja TestGroups. */
  testGroups: ImportEntidadResumen
  /** Membresías Elemento↔TG a crear (columna TestGroupCodigo de la hoja Elementos). */
  testGroupMembresias: ImportEntidadResumen
  /** Errores mostrados (cap 100). Si totalErrores > errores.length, la UI debe indicarlo. */
  errores: ImportError[]
  /** Total real de errores del import (puede ser mayor a errores.length por el cap del server). */
  totalErrores: number
  esAplicable: boolean
}

export interface ImportResultado {
  aplicado: boolean
  preview: ImportPreview
  mensaje: string
}

// ── Estado del job de import (T1+F del roadmap de imports) ──────────────────

export type ImportacionEstado =
  | "Encolado"
  | "Parseando"
  | "Validando"
  | "AplicandoSistemas"
  | "AplicandoSubsistemas"
  | "AplicandoElementos"
  | "SincronizandoTareas"
  | "SincronizandoDependencias"
  | "VinculandoModelo3D"
  | "Completado"
  | "Fallido"
  | "CanceladoPorError"

export interface ImportacionFaseTiming {
  fase: string
  milisegundosTotal: number
  filasProcesadas: number | null
}

export interface ImportacionJobEstado {
  jobId: string
  estado: number // enum ordinal — el server también manda estadoTexto
  estadoTexto: ImportacionEstado
  proyectoId: string
  usuarioId: string
  iniciadoEn: string
  finalizadoEn: string | null
  duracionMs: number | null
  mensajeActual: string
  porcentajeAvance: number
  totalFilas: number
  filasProcesadas: number
  timings: ImportacionFaseTiming[]
  mensajeFinal: string | null
  error: string | null
  preview: ImportPreview | null
}

/** Preview de importación de Pendientes (hoja única, un solo resumen). */
export interface ImportPendientesPreview {
  pendientes: ImportEntidadResumen
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportPendientesResultado {
  aplicado: boolean
  preview: ImportPendientesPreview
  mensaje: string
}

/** Preview de importación de Tareas (hoja única, un solo resumen). */
export interface ImportTareasPreview {
  tareas: ImportEntidadResumen
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportTareasResultado {
  aplicado: boolean
  preview: ImportTareasPreview
  mensaje: string
}

/** Preview de importación de valores precargados a nivel elemento. */
export interface ImportValoresPrecargadosPreview {
  valoresPrecargados: ImportEntidadResumen
  elementosAfectados: number
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportValoresPrecargadosResultado {
  aplicado: boolean
  preview: ImportValoresPrecargadosPreview
  mensaje: string
}

/** Preview de importación de Planificación (SubSistema × Nivel, hoja única). */
export interface ImportPlanificacionPreview {
  planificacion: ImportEntidadResumen
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportPlanificacionResultado {
  aplicado: boolean
  preview: ImportPlanificacionPreview
  mensaje: string
}
