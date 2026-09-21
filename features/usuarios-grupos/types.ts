export interface UsuarioGrupo {
  id: string
  nombre: string
  descripcion: string | null
  /** Se muestra como opción al configurar la matriz de autorización del workflow de Pendientes. */
  usoPendientes: boolean
  /** Se muestra al elegir area afectada/seguimiento de una No Conformidad y en su matriz de autorizacion. */
  usoCalidad: boolean
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
export type UsoGrupoFiltro = "pendientes" | "acceso-proyecto" | "calidad"

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
  /** Se muestra al elegir area afectada/seguimiento de una No Conformidad y en su matriz de autorizacion. */
  usoCalidad: boolean
  usoAccesoProyecto: boolean
}

/**
 * Qué pierde una persona si se la saca de un grupo. Lo calcula el backend y alimenta la
 * confirmación: los grupos son globales y sus efectos alcanzan proyectos que quien la
 * quita puede no administrar.
 *
 * Todo viene NETO — si otro grupo del usuario le da lo mismo, no aparece.
 */
export interface QuitarMiembroImpacto {
  /** Ámbitos restringidos que deja de ver. Es la pérdida más grave: ahí no hay fallback por rol. */
  ambitosQueDejaDeVer: string[]
  permisosQuePierde: PermisoPerdido[]
  /** Pendientes que salen de su bandeja "Míos" porque el vínculo era el grupo. */
  pendientesQueSalenDeMios: number
  noConformidadesAfectadas: number
  /** True cuando nada aplica: el cliente confirma directo en vez de abrir un diálogo vacío. */
  sinImpacto: boolean
}

export interface PermisoPerdido {
  proyectoId: string
  proyectoNombre: string
  ambitoNombre: string
  acciones: string[]
  /** False cuando el proyecto queda fuera del alcance de quien está quitando al miembro. */
  esProyectoPropio: boolean
}

/**
 * Un grupo tal como se ofrece al elegir el responsable de un pendiente. Vista operativa:
 * la consume quien crea o reasigna, no quien administra grupos.
 */
export interface GrupoResponsableOpcion {
  id: string
  nombre: string
  descripcion: string | null
  /** Miembros activos, en cualquier proyecto. */
  cantidadMiembros: number
  /**
   * Miembros que VEN el proyecto activo. Es el que importa al asignar: con cero, el
   * pendiente queda asignado a un grupo del que nadie se va a enterar.
   */
  miembrosEnProyecto: number
}
