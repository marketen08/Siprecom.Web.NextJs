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

/** Formato del archivo 3D — define qué viewer renderiza. */
export const FormatoArchivo3d = {
  Ifc: 1,
  Nwd: 2,
} as const
export type FormatoArchivo3dValue =
  (typeof FormatoArchivo3d)[keyof typeof FormatoArchivo3d]

/** Estado del job de Model Derivative en APS (NWD/RVT). */
export const ApsTranslationStatus = {
  NoAplica:  0,
  Pendiente: 1,
  EnProceso: 2,
  Completado: 3,
  Error:      4,
} as const
export type ApsTranslationStatusValue =
  (typeof ApsTranslationStatus)[keyof typeof ApsTranslationStatus]

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
  formatoArchivo: FormatoArchivo3dValue
  apsUrn: string | null
  apsTranslationStatus: ApsTranslationStatusValue
  apsTranslationProgress: number | null
  apsTranslationError: string | null
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

/**
 * Filtros visuales para el visor 3D. Cada categoría es multi-select; vacías
 * significan "no filtrar por esta dimensión". Las dimensiones combinan con AND.
 */
export interface FiltroVisor {
  sistemaIds: string[]
  subSistemaIds: string[]
  especialidadIds: string[]
  /** IDs de Niveles (PRECOMISIONADO/COMISIONADO). Filtra Elementos que tienen al menos una ElementoTarea de esos niveles. */
  nivelIds: string[]
  /** Estados visuales del Elemento (1..4) — ver EstadoVisualIds. */
  estadosVisuales: number[]
  /**
   * Si es true, oculta las entidades sin Elemento vinculado, independiente del
   * resto del filtro. Sirve para limpiar "ruido" CAD (líneas, agrupadores) que
   * no son items de tracking. Cuando es true, isFiltroVacio devuelve false →
   * el viewer aplica el ghost aunque no haya otros criterios.
   */
  ocultarNoVinculadas: boolean
}

/** Valores del enum EstadoVisualElemento del backend. */
export const EstadoVisualIds = {
  NoIniciado: 1,
  EnCurso:    2,
  Completado: 3,
  Rechazado:  4,
} as const

export interface FiltroResultado {
  guidsCoinciden: string[]
  totalCoinciden: number
  totalEntidades: number
}

export function isFiltroVacio(f: FiltroVisor): boolean {
  return f.sistemaIds.length === 0
    && f.subSistemaIds.length === 0
    && f.especialidadIds.length === 0
    && f.nivelIds.length === 0
    && f.estadosVisuales.length === 0
    && !f.ocultarNoVinculadas
}

export function filtroVacio(): FiltroVisor {
  return {
    sistemaIds: [],
    subSistemaIds: [],
    especialidadIds: [],
    nivelIds: [],
    estadosVisuales: [],
    ocultarNoVinculadas: false,
  }
}

/** Buckets de IfcGuids por estado visual del Elemento vinculado. */
export interface ColoresPorEstado {
  noIniciados: string[]
  enCurso: string[]
  completados: string[]
  rechazados: string[]
  totalConVinculo: number
}

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
