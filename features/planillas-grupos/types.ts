export interface PlanillaGrupo {
  id: string
  nombre: string
  descripcion: string | null
  /** Cantidad de planillas asignadas activas al grupo. */
  cantidadPlanillas: number
  /**
   * Cantidad de proyectos que tienen este grupo habilitado. Sirve para
   * mostrar en el listado y anticipar por qué el delete puede fallar.
   */
  proyectosEnUso: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PlanillaGrupoAsignacion {
  asignacionId: string
  planillaId: string
  planillaCodigo: string
  planillaNombre: string
  fechaAlta: string
}

export interface PlanillaGrupoDetalle extends PlanillaGrupo {
  planillas: PlanillaGrupoAsignacion[]
}

export interface PlanillaGrupoInput {
  nombre: string
  descripcion?: string
}
