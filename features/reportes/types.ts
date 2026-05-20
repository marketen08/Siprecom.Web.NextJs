// Tipos del reporte "Listado Índice" — espejo de los DTOs del backend
// (Core/DTOs/Reportes/ListadoIndiceDTO.cs).

export interface ListadoIndiceFiltros {
  nivelId?: string
  sistemaId?: string
  subSistemaId?: string
  especialidadId?: string
  elementoTipoId?: string
}

export interface ListadoIndiceTarea {
  elementoTareaId: string
  tareaNombre: string | null
  /** 1=PENDIENTE, 2=EN_PROCESO, 3=COMPLETADO, 4=APROBADO, 5=RECHAZADO, 7=FIRMADO */
  estado: number
  estadoTexto: string | null
}

export interface ListadoIndiceElemento {
  elementoId: string
  tag: string | null
  nombre: string | null
  /** % avance del elemento considerando solo las tareas del nivel actual del agrupamiento. */
  porcentajeAvance: number
  tareas: ListadoIndiceTarea[]
}

export interface ListadoIndiceEspecialidadGrupo {
  especialidadId: string | null
  especialidadNombre: string | null
  especialidadColor: string | null
  elementos: ListadoIndiceElemento[]
}

export interface ListadoIndiceSubSistemaGrupo {
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  totalTareas: number
  tareasCompletadas: number
  tareasPendientes: number
  especialidades: ListadoIndiceEspecialidadGrupo[]
}

export interface ListadoIndiceSistemaGrupo {
  sistemaId: string | null
  sistemaCodigo: string | null
  sistemaNombre: string | null
  subSistemas: ListadoIndiceSubSistemaGrupo[]
}

export interface ListadoIndiceNivelGrupo {
  nivelId: string | null
  nivelNombre: string | null
  nivelPosicion: number | null
  sistemas: ListadoIndiceSistemaGrupo[]
}

export interface ListadoIndicePreview {
  totalElementos: number
  totalTareas: number
  niveles: ListadoIndiceNivelGrupo[]
}
