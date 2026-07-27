/** Estados del workflow de Pendientes (IDs fijos del seed backend). */
export const PENDIENTE_ESTADO_IDS = {
  ABIERTO: "estado-pend-abierto",
  EN_PROCESO: "estado-pend-en-proceso",
  PENDIENTE_APROBACION: "estado-pend-aprobacion",
  CERRADO: "estado-pend-cerrado",
  CANCELADO: "estado-pend-cancelado",
} as const

export const PRIORIDAD: Record<number, string> = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Urgente",
}

export const PRIORIDAD_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-blue-50 text-blue-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
}

export const ESTADO_COLOR: Record<string, string> = {
  ABIERTO: "bg-gray-100 text-gray-700",
  EN_PROCESO: "bg-blue-100 text-blue-700",
  PENDIENTE_APROBACION: "bg-amber-100 text-amber-800",
  CERRADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
}

export const ESTADO_LABEL: Record<string, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  PENDIENTE_APROBACION: "Esperando aprobación",
  CERRADO: "Cerrado",
  CANCELADO: "Cancelado",
}

export interface PendienteCategoria {
  id: string
  nombre: string
}

export interface PendienteTipo {
  id: string
  tipo: string
  /** Categoría que se pre-selecciona al elegir este Tipo en el wizard (opcional). */
  categoriaSugeridaId?: string | null
  categoriaSugeridaNombre?: string | null
}

export interface PendienteEstado {
  id: string
  estado: string
}

export interface PendienteAccion {
  id: string
  nombre: string
}

export interface PendienteMotivo {
  id: string
  nombre: string
}

export interface Pendiente {
  id: string
  codigo: number
  codigoFormateado: string
  proyectoId: string
  subSistemaId: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  elementoId: string | null
  elementoTag: string | null
  elementoNombre: string | null
  categoriaId: string
  categoriaNombre: string | null
  tipoId: string
  tipoNombre: string | null
  estadoId: string
  estadoNombre: string | null
  prioridad: number
  prioridadTexto: string
  detectadoPorId: string
  detectadoPorNombre: string | null
  responsableId: string
  responsableNombre: string | null
  descripcion: string
  pid: string | null
  especialidadId: string | null
  especialidadNombre: string | null
  circuito: string | null
  // Wizard de descripción (5 dimensiones — opcional).
  nivelId?: string | null
  nivelNombre?: string | null
  accionId?: string | null
  accionNombre?: string | null
  motivoId?: string | null
  motivoNombre?: string | null
  fechaDeteccion: string
  fechaCierreEstimado: string
  fechaCierre: string | null
  cierrePorId: string | null
  cierrePorNombre: string | null
  fechaDesestimado: string | null
  desestimadoPorId: string | null
  desestimadoPorNombre: string | null
  motivoRechazoCierre: string | null
  /** True cuando el pendiente fue cerrado con carga de PDF físico y ese archivo está disponible para descarga. */
  tienePdfFisico?: boolean
  // Vínculo opcional a un pin sobre un PID (visor tablet). Todos van juntos:
  // si `pidArchivoId` no es null, los otros 3 tampoco.
  pidArchivoId?: string | null
  pidArchivoCodigo?: string | null
  pidPagina?: number | null
  pidCoordX?: number | null
  pidCoordY?: number | null
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface PendienteComentario {
  id: string
  pendienteId: string
  comentario: string
  autorId: string
  autorNombre: string | null
  createdAt: string
}

export interface PendienteAdjunto {
  id: string
  pendienteId: string
  fileName: string
  fileType: string | null
  url: string
  urlExpiraEn: string | null
  createdAt: string
  createdByNombre: string | null
}

export interface PendienteHistorial {
  id: string
  estadoAnteriorId: string | null
  estadoAnteriorNombre: string | null
  estadoNuevoId: string
  estadoNuevoNombre: string | null
  responsableAnteriorId: string | null
  responsableAnteriorNombre: string | null
  responsableNuevoId: string | null
  responsableNuevoNombre: string | null
  comentario: string | null
  fecha: string
  usuarioId: string
  usuarioNombre: string | null
}

export interface PendienteDetalle extends Pendiente {
  comentarios: PendienteComentario[]
  adjuntos: PendienteAdjunto[]
  historial: PendienteHistorial[]
}

export interface PendienteCreateInput {
  categoriaId: string
  tipoId: string
  responsableId: string
  descripcion: string
  prioridad: number
  fechaCierreEstimado: string // YYYY-MM-DD
  subSistemaId?: string | null
  elementoId?: string | null
  especialidadId?: string | null
  pid?: string | null
  circuito?: string | null

  /**
   * Vínculo opcional a un punto de un PID: se setean cuando el pendiente se crea
   * desde el visor tap-en-plano. Los 4 campos van juntos — el backend valida.
   */
  pidArchivoId?: string | null
  pidPagina?: number | null
  pidCoordX?: number | null
  pidCoordY?: number | null
}

export interface PendienteUpdateInput {
  categoriaId: string
  tipoId: string
  descripcion: string
  prioridad: number
  fechaCierreEstimado: string
  subSistemaId?: string | null
  elementoId?: string | null
  especialidadId?: string | null
  pid?: string | null
  circuito?: string | null
}

export interface PendienteFilterInput {
  search?: string
  sistemaId?: string
  subSistemaId?: string
  elementoId?: string
  categoriaId?: string
  tipoId?: string
  estadoId?: string
  responsableId?: string
  detectadoPorId?: string
  prioridad?: number
  especialidadId?: string
  pidArchivoId?: string
  soloAbiertos?: boolean
  /** Solo pendientes donde el usuario es creador (DetectadoPor) o responsable. Default UI para roles < Supervisor. */
  soloMios?: boolean
  orderBy?: string
  orderDescending?: boolean
}
