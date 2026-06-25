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
  errores: ImportError[]
  esAplicable: boolean
}

export interface ImportResultado {
  aplicado: boolean
  preview: ImportPreview
  mensaje: string
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
