// Tipos espejados de Core/DTOs/ProyectoIfc/ProyectoIfcArchivoDTO.cs y ProyectoIfcEntidadDTO.cs

/** Estados del procesamiento server-side (xbim parse + auto-match). */
export const EstadoProcesamientoIfc = {
  Pendiente:  1,
  Procesando: 2,
  Completado: 3,
  Error:      4,
} as const
export type EstadoProcesamientoIfcValue =
  (typeof EstadoProcesamientoIfc)[keyof typeof EstadoProcesamientoIfc]

export interface ProyectoIfcArchivo {
  id: string
  proyectoId: string
  nombre: string
  disciplina: string | null
  nombreArchivo: string | null
  contentType: string | null
  tamanioBytes: number | null
  createdAt: string
  createdByNombre: string | null
  // Procesamiento (Fase 2)
  estadoProcesamiento: EstadoProcesamientoIfcValue
  errorProcesamiento: string | null
  entidadesDetectadas: number | null
  entidadesVinculadas: number | null
  ultimoProcesamientoAt: string | null
  esArchivoBootstrap: boolean
  esPrincipal: boolean
}

export interface ProyectoIfcArchivoCreateInput {
  nombre: string
  disciplina?: string
  archivo: File
}

export interface ProyectoIfcArchivoUrl {
  url: string
  nombreArchivo: string | null
  expiraEnMinutos: number
}

export interface ProyectoIfcEntidad {
  id: string
  proyectoIfcArchivoId: string
  ifcGuid: string
  ifcType: string | null
  tagDetectado: string | null
  nombre: string | null
  elementoId: string | null
  elementoTag: string | null
  elementoNombre: string | null
  vinculadoManualmente: boolean
}

export interface ProyectoIfcEntidadesPage {
  items: ProyectoIfcEntidad[]
  page: number
  pageSize: number
  total: number
}

export type EntidadFiltro = "todas" | "vinculadas" | "no-vinculadas"

export interface CrearProyectoDesdeIfcInput {
  nombre: string
  clienteId: string
  nombreArchivo?: string
  disciplina?: string
  archivo: File
}

export interface CrearProyectoDesdeIfcOutput {
  proyectoId: string
  proyectoIfcArchivoId: string
}
