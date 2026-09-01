export interface UsuarioGrupo {
  id: string
  nombre: string
  descripcion: string | null
  /** Se muestra como opción al configurar la matriz de autorización del workflow de Pendientes. */
  usoPendientes: boolean
  /** Se muestra como opción al asignar usuarios a un proyecto ("Agregar desde grupo"). */
  usoAccesoProyecto: boolean
  cantidadMiembros: number
  /**
   * Total de referencias vivas al grupo (pendientes por visibilidad,
   * pendientes por responsable, proyectos como default, filas de la matriz
   * de autorización). Sirve para mostrar un badge "en uso" y anticipar por
   * qué el delete puede fallar.
   */
  referenciasEnUso: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Filtro opcional para el listado de grupos, usado por contextos específicos. */
export type UsoGrupoFiltro = "pendientes" | "acceso-proyecto"

export interface UsuarioGrupoMiembro {
  membresiaId: string
  usuarioId: string
  nombre: string | null
  apellido: string | null
  email: string | null
  fechaAlta: string
}

export interface UsuarioGrupoDetalle extends UsuarioGrupo {
  miembros: UsuarioGrupoMiembro[]
}

export interface UsuarioGrupoInput {
  nombre: string
  descripcion?: string
  usoPendientes: boolean
  usoAccesoProyecto: boolean
}
