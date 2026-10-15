export interface PidArchivo {
  id: string
  proyectoId: string
  codigo: string
  nombre: string
  descripcion: string | null
  nombreArchivo: string | null
  contentType: string | null
  tamanioBytes: number | null
  pageCount: number
  cantidadPendientes: number
  subSistemaIds: string[]
  subSistemaCodigos: string[]
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface PidArchivoDetalle extends PidArchivo {
  subSistemas: {
    subSistemaId: string
    codigo: string
    nombre: string
  }[]
}

export interface PidArchivoDownload {
  url: string
  nombreArchivo: string | null
  expiraEnMinutos: number
}

/** Payload delgado que el visor usa para dibujar los pines sobre el PDF. */
export interface PidPendientePin {
  id: string
  codigo: number
  codigoFormateado: string
  pagina: number
  coordX: number
  coordY: number
  estadoId: string
  estadoNombre: string
  prioridad: number
  categoriaNombre: string
  tipoNombre: string
  responsableNombre: string
  descripcion: string
}

export interface PidArchivoCreateInput {
  codigo: string
  nombre: string
  descripcion?: string
  subSistemaIds: string[]
}

export interface PidArchivoUpdateInput extends PidArchivoCreateInput {}
