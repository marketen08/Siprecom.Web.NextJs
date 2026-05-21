// Tipos del reporte "Listado Índice" — espejo de los DTOs del backend
// (Core/DTOs/Reportes/ListadoIndiceDTO.cs).

export interface ListadoIndiceFiltros {
  nivelId?: string
  sistemaId?: string
  subSistemaId?: string
  especialidadId?: string
  elementoTipoId?: string
  /** 1=PENDIENTE, 2=EN_PROCESO, 3=COMPLETADO, 4=APROBADO (Firmado físico),
   *  5=RECHAZADO, 7=FIRMADO. CANCELADO no aplica al reporte. */
  estado?: number
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

// ── Avance del proyecto ─────────────────────────────────────────────────────

export interface AvanceProyectoFiltros {
  nivelId?: string
  sistemaId?: string
  subSistemaId?: string
  especialidadId?: string
}

export interface AvanceProyectoSubSistema {
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  totalTareas: number
  tareasCompletadas: number
  tareasPendientes: number
  porcentajeAvance: number
}

export interface AvanceProyectoSistema {
  sistemaId: string | null
  sistemaCodigo: string | null
  sistemaNombre: string | null
  totalTareas: number
  tareasCompletadas: number
  tareasPendientes: number
  porcentajeAvance: number
  subSistemas: AvanceProyectoSubSistema[]
}

export interface AvanceProyectoNivel {
  nivelId: string | null
  nivelNombre: string | null
  nivelPosicion: number | null
  totalTareas: number
  tareasCompletadas: number
  tareasPendientes: number
  porcentajeAvance: number
  sistemas: AvanceProyectoSistema[]
}

export interface AvanceProyectoPreview {
  totalSubSistemas: number
  totalTareas: number
  tareasCompletadas: number
  porcentajeGlobal: number
  niveles: AvanceProyectoNivel[]
}

// ── Tareas realizadas ───────────────────────────────────────────────────────

export interface TareasRealizadasFiltros {
  /** ISO strings. Default backend: últimos 30 días. */
  fechaDesde?: string
  fechaHasta?: string
  usuarioId?: string
  /** 1=COMPLETADO, 4=APROBADO, 7=FIRMADO. Default: las tres. */
  estado?: number
  nivelId?: string
  sistemaId?: string
  subSistemaId?: string
  especialidadId?: string
}

export interface TareaRealizadaFirma {
  usuarioId: string | null
  nombreFirmante: string | null
  rolFirmante: string | null
  fechaFirma: string
}

export interface TareaRealizadaItem {
  elementoTareaId: string
  fechaFinalizacion: string
  elementoTag: string | null
  elementoNombre: string | null
  tareaNombre: string | null
  sistemaCodigo: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  nivelNombre: string | null
  especialidadNombre: string | null
  especialidadColor: string | null
  estado: number
  estadoTexto: string | null
  completadorId: string | null
  completadorNombre: string | null
  firmas: TareaRealizadaFirma[]
}

export interface TareasRealizadasUsuarioStats {
  usuarioId: string
  usuarioNombre: string | null
  cantidad: number
}

export interface TareasRealizadasPreview {
  fechaDesdeAplicada: string
  fechaHastaAplicada: string
  totalRealizadas: number
  promedioPorDia: number
  cantCompletado: number
  cantFirmado: number
  cantAprobado: number
  topUsuarios: TareasRealizadasUsuarioStats[]
  tareas: TareaRealizadaItem[]
}

// ── Listado de pendientes ───────────────────────────────────────────────────

export interface ListadoPendientesFiltros {
  sistemaId?: string
  subSistemaId?: string
  categoriaId?: string
  tipoId?: string
  estadoId?: string
  responsableId?: string
  /** Prioridad enum: 1=Baja, 2=Media, 3=Alta, 4=Urgente (sigue Prioridad de Pendientes). */
  prioridad?: number
  /** Default backend: true (excluye CERRADO y CANCELADO). */
  soloAbiertos?: boolean
}

export interface ListadoPendientesItem {
  id: string
  codigoFormateado: string
  descripcion: string | null
  elementoTag: string | null
  elementoNombre: string | null
  categoriaNombre: string | null
  tipoNombre: string | null
  prioridad: number
  prioridadTexto: string | null
  estadoId: string | null
  estadoNombre: string | null
  responsableId: string | null
  responsableNombre: string | null
  fechaDeteccion: string
  fechaCierreEstimado: string
}

export interface ListadoPendientesSubSistemaGrupo {
  subSistemaId: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  total: number
  abiertos: number
  cerrados: number
  pendientes: ListadoPendientesItem[]
}

export interface ListadoPendientesSistemaGrupo {
  sistemaId: string | null
  sistemaCodigo: string | null
  sistemaNombre: string | null
  subSistemas: ListadoPendientesSubSistemaGrupo[]
}

export interface ListadoPendientesPreview {
  total: number
  abiertos: number
  enProceso: number
  cerrados: number
  cancelados: number
  criticos: number
  sistemas: ListadoPendientesSistemaGrupo[]
}
