export interface UsuarioGrupo {
  id: string
  nombre: string
  descripcion: string | null
  /** Se muestra como opción al configurar la matriz de autorización del workflow de Pendientes. */
  usoPendientes: boolean
  /** Se muestra como opción al asignar usuarios a un proyecto ("Agregar desde grupo"). */
  usoAccesoProyecto: boolean
  /**
   * Se muestra como opción al restringir la visibilidad de un pendiente
   * (pendientes internos). Opt-in explícito — default false.
   */
  usoVisibilidadPendientes: boolean
  cantidadMiembros: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Filtro opcional para el listado de grupos, usado por contextos específicos. */
export type UsoGrupoFiltro = "pendientes" | "acceso-proyecto" | "visibilidad-pendientes"

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
  usoVisibilidadPendientes: boolean
}
