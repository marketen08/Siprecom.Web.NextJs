export const ESTADO_PROYECTO = {
  1: "Preparación",
  2: "En curso",
  3: "Pausado",
  4: "Completado",
  5: "Cancelado",
  6: "En cierre",
  7: "Cerrado",
} as const

export type EstadoProyecto = keyof typeof ESTADO_PROYECTO

export interface Proyecto {
  id: string
  nombre: string
  clienteId: string
  clienteNombre: string | null
  contratistaId: string
  contratistaNombre: string | null
  estado: EstadoProyecto
  estadoTexto: string
  observaciones: string
  permitirAvanceSinRegistro: boolean
  permitirDescargarPlanillas: boolean
  permitirDescargarProcedimientos: boolean
  permitirDescargarRegistros: boolean
  permitirTestFuncional: boolean
  permitirRegistroFisico: boolean
  permitirRegistroDigital: boolean
  /** Si está en false, ningún registro del proyecto acepta adjuntos. Default true. */
  permiteAdjuntos: boolean
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ProyectoCreateInput {
  nombre: string
  clienteId: string
  contratistaId: string
  estado: EstadoProyecto
  observaciones: string
  proyectoPlantillaId?: string
}

export interface ProyectoUpdateInput {
  nombre: string
  clienteId: string
  contratistaId: string
  estado: EstadoProyecto
  observaciones: string
}

export interface PagedResponse<T> {
  data: T[]
  total: number
  page?: number
  pageSize?: number
  hasNextPage: boolean
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface ProyectoBoolUpdateInput {
  campo: string
  valor: boolean
}

export interface FirmaConfigItem {
  id?: string
  orden: number
  rolNombre: string
  descripcion: string
  esObligatorio: boolean
}

export interface ProyectoUsuarioRol {
  id: string
  userId: string
  userName: string
  email: string
  rolNombre: string
}

export interface AsignarUsuarioRolInput {
  userId: string
  rolNombre: string
}
