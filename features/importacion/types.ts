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
