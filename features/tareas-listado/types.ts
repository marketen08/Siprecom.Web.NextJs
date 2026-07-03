export const ESTADO_ET = {
  PENDIENTE: 1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  APROBADO: 4,
  RECHAZADO: 5,
  CANCELADO: 6,
  FIRMADO: 7,
} as const

export type EstadoET = (typeof ESTADO_ET)[keyof typeof ESTADO_ET]

export const ESTADO_ET_LABEL: Record<number, string> = {
  1: "Pendiente",
  2: "En proceso",
  3: "Completado",
  4: "Aprobado",
  5: "Rechazado",
  6: "Cancelado",
  7: "Firmado",
}

export interface TareaListadoRow {
  elementoTareaId: string
  elementoId: string
  planillaId: string | null
  registroId: string | null
  /** True si el registro es físico (PDF escaneado). Null si no hay registro. */
  registroEsFisico: boolean | null

  tag: string
  elementoNombre: string
  tareaNombre: string
  /** Código unificado {Elemento.Codigo}-{Tarea.Codigo} — mismo que sale en el PDF. */
  codigo: string

  estado: EstadoET
  estadoTexto: string

  nivelId: string | null
  nivelNombre: string | null
  sistemaId: string
  sistemaCodigo: string | null
  sistemaNombre: string | null
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  especialidadId: string | null
  especialidadNombre: string | null
  elementoTipoId: string | null
  elementoTipoNombre: string | null

  prioridad: number
  prioridadTexto: string

  fechaEstimada: string | null
  fechaFinalizacion: string | null
}

export interface TareasListadoFiltros {
  sistemaId?: string
  subSistemaId?: string
  especialidadId?: string
  elementoTipoId?: string
  nivelId?: string
  /** Lista de estados a incluir. Vacío = todos. */
  estados?: EstadoET[]
  prioridad?: number
  search?: string
}

export interface TareasListadoPaged {
  total: number
  page: number
  pageSize: number
  items: TareaListadoRow[]
}
