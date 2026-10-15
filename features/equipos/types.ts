/**
 * Equipos de administración: dueños del catálogo de planillas.
 *
 * Un Admin administra las planillas de los equipos a los que tiene acceso; las planillas sin
 * equipo son globales y las administra AdminGlobal. El acceso a un equipo lo da únicamente
 * AdminGlobal, y ahí está el límite del modelo — el equipo activo es contexto de trabajo, no
 * permiso. Ver Siprecom.Server.Api/Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md.
 */

export interface Equipo {
  id: string
  nombre: string
  descripcion: string | null
  cantidadMiembros: number
  cantidadPlanillas: number
  cantidadProyectos: number
}

export interface EquipoMiembro {
  usuarioId: string
  userName: string | null
  email: string | null
  nombre: string | null
  apellido: string | null
  /** True si este equipo es el que el usuario tiene activo. */
  esActivo: boolean
  /** Otros equipos del usuario. Lo normal es vacío: tener dos es la excepción. */
  otrosEquipos: string[]
}

export interface EquipoDetalle extends Equipo {
  miembros: EquipoMiembro[]
}

export interface EquipoInput {
  nombre: string
  descripcion?: string | null
}

export interface EquipoOpcion {
  id: string
  nombre: string
}

/** Lo que el menú del perfil necesita para mostrar (y quizá ofrecer cambiar) el equipo. */
export interface MisEquipos {
  equipos: EquipoOpcion[]
  equipoActivoId: string | null
  /** True para AdminGlobal: puede trabajar sobre las globales, que es su default. */
  puedeElegirGlobales: boolean
}
