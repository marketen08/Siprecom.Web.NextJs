/**
 * Ámbito de un pendiente: la clase de información a la que pertenece y, con ella,
 * quién lo ve. Reemplaza al booleano `esInterno`.
 *
 * El catálogo es global al tenant (lo administra AdminGlobal en Configuración →
 * Pendientes → Ámbitos). Lo que es por proyecto es la matriz de acciones.
 */
export enum AudienciaAmbito {
  /** Cualquiera con acceso al proyecto. Sin lista que mantener. */
  TodoElProyecto = 1,
  /** Solo los miembros de los grupos de la audiencia. */
  SoloGrupos = 2,
}

export interface PendienteAmbitoGrupo {
  grupoId: string
  grupoNombre: string
}

export interface PendienteAmbito {
  id: string
  nombre: string
  descripcion: string | null
  audiencia: AudienciaAmbito
  audienciaTexto: string
  orden: number
  /** Ámbito por defecto al crear, filtro por defecto de reportes, y no borrable. */
  esPrincipal: boolean
  isActive: boolean
  grupos: PendienteAmbitoGrupo[]
  /**
   * Un ámbito de audiencia restringida sin grupos no lo ve nadie, así que no se
   * ofrece al crear. Se muestra igual en la configuración, con la advertencia:
   * un ámbito listado con la audiencia vacía se explica solo, uno que desaparece no.
   */
  configurado: boolean
}

export interface PendienteAmbitoSet {
  nombre: string
  descripcion?: string | null
  audiencia: AudienciaAmbito
  orden: number
  esPrincipal: boolean
  grupoIds: string[]
}
