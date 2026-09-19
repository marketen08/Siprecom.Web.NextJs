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
  /**
   * Clave del ícono con que se marca el ámbito en los listados, y token de color.
   * Claves semánticas, no nombres de lucide: el mobile dibuja lo mismo con Ionicons.
   * Ver `presentacion.ts` para el mapeo, y `AmbitoPresentacion` en el backend para
   * el conjunto válido. Sin ícono, el ámbito no se marca.
   */
  icono: string | null
  color: string | null
  /**
   * Pasos del workflow que existen en este ámbito. Los dos arrancan en true: el
   * circuito completo es el techo. Apagar "Iniciar" hace que el responsable mande el
   * pendiente a aprobación directo desde Abierto; apagar "Pre-aprobar" saca el paso de
   * revisión interna y el cierre se aprueba sobre Esperando aprobación.
   */
  pasoIniciar: boolean
  pasoPreAprobar: boolean
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
  icono?: string | null
  color?: string | null
  pasoIniciar: boolean
  pasoPreAprobar: boolean
  grupoIds: string[]
}
