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
  // permitirDescargarProcedimientos y nivelesSecuenciales viven en `funcionalidadesEfectivas`
  // (claves DESCARGAR_PROCEDIMIENTOS y NIVELES_SECUENCIALES).
  permitirDescargarRegistros: boolean
  permitirTestFuncional: boolean
  permitirRegistroFisico: boolean
  permitirRegistroDigital: boolean
  /** Si está activo, los PDFs físicos cargados se asumen firmados en papel y la tarea pasa directo a "Firmado físico" sin firmas digitales. Sólo aplica si permitirRegistroFisico = true. */
  registrosFisicosPreFirmados: boolean
  /** Si está activo, las firmas electrónicas de registros físicos se pintan superpuestas en el recuadro de firmas del escaneo (además de la página de certificado al final). Sólo aplica si permitirRegistroFisico = true. */
  renderizarFirmasDigitalesEnRecuadro: boolean
  /** Si está en false, ningún registro del proyecto acepta adjuntos. Default true. */
  permiteAdjuntos: boolean
  /** Calendario laboral: lun-vie son siempre laborables. Estos flags habilitan sábado y/o domingo. */
  incluirSabado: boolean
  incluirDomingo: boolean
  /**
   * Lista CSV de property names a probar como TAG al procesar archivos APS
   * (NWD/RVT). Solo aplica si el proyecto importó un modelo Plant 3D. Si está
   * vacío, el extractor usa el default: "AutoCad.Tag,CADWorx.Line Number,AutoCad.Line Number".
   */
  apsTagProperties: string | null
  /**
   * URL canónica del logo combinado del proyecto. Cuando está seteado, el PDF
   * de planillas muestra solo esta imagen en el header (reemplaza al par
   * cliente+contratista). Null = comportamiento default.
   */
  urlLogoHeader: string | null
  /**
   * Nivel del catálogo que representa "Mechanical Completion" en este proyecto.
   * Cuando es null, el certificado MC queda en "no aplica" en todo el proyecto.
   */
  nivelMcId: string | null
  nivelMcNombre: string | null
  /**
   * Grupo aplicado por defecto al activar el toggle "Pendiente interno" al
   * crear un pendiente en este proyecto. Null = el proyecto no ofrece default,
   * el toggle abre "Opciones avanzadas" pidiendo elegir uno.
   */
  grupoVisibilidadPorDefectoId: string | null
  grupoVisibilidadPorDefectoNombre: string | null
  /**
   * Grupo aplicado por defecto al activar el toggle "Asignar al grupo
   * responsable por defecto" al crear un pendiente en este proyecto. Null =
   * el proyecto no ofrece default.
   */
  grupoResponsablePorDefectoId: string | null
  grupoResponsablePorDefectoNombre: string | null
  /**
   * Estado efectivo (global AND proyecto) de cada funcionalidad toggleable, por
   * clave del catálogo. Ej: { MAQUETA_3D: true }. Solo viene en el detalle del
   * proyecto (GET /proyectos/{id}).
   */
  funcionalidadesEfectivas?: Record<string, boolean>
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ProyectoClonOptions {
  tareas: boolean
  flags: boolean
  firmas: boolean
  acceso: boolean
  estructura: boolean
  funcionalidades: boolean
}

export interface ProyectoCreateInput {
  nombre: string
  clienteId: string
  contratistaId: string
  estado: EstadoProyecto
  observaciones: string
  proyectoPlantillaId?: string
  clonar?: ProyectoClonOptions
}

export interface ProyectoUpdateInput {
  nombre: string
  clienteId: string
  contratistaId: string
  estado: EstadoProyecto
  observaciones: string
  apsTagProperties?: string | null
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

/** Espejo del enum TipoFirmaConfig del backend. */
export const TIPO_FIRMA_CONFIG = {
  DIGITAL: 1,
  FISICA: 2,
} as const

export type TipoFirmaConfig = (typeof TIPO_FIRMA_CONFIG)[keyof typeof TIPO_FIRMA_CONFIG]

export const TIPO_FIRMA_CONFIG_LABEL: Record<number, string> = {
  1: "Digital",
  2: "En papel",
}

export interface FirmaConfigItem {
  id?: string
  orden: number
  rolNombre: string
  descripcion: string
  esObligatorio: boolean
  /** Digital (1, default) = firma electrónica en la app. Fisica (2) = firma manuscrita en el papel. */
  tipoFirma: TipoFirmaConfig
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
