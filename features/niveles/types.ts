export interface Nivel {
  id: string
  nombre: string
  posicion: number
  /** Hex #RRGGBB o #RRGGBBAA. Null = sin color asignado (el UI cae a un gris neutro). */
  color: string | null
  /**
   * Cómo se llama el entregable que agrupa los registros de este nivel —
   * "Dossier" en comisionado, "Databook" en calidad. Null/vacío = el default de
   * `features/databook/lib/documento.ts`.
   */
  nombreDocumento: string | null
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface NivelCreateInput {
  nombre: string
  posicion: number
  color?: string | null
  nombreDocumento?: string | null
}

export interface NivelUpdateInput {
  nombre: string
  posicion: number
  color?: string | null
  nombreDocumento?: string | null
}
