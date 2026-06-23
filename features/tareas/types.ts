export const PRIORIDAD: Record<number, string> = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Urgente",
}

export const PRIORIDAD_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-red-100 text-red-700",
}

export interface Tarea {
  id: string
  codigo: number
  nombre: string
  proyectoId: string
  proyectoNombre?: string
  elementoTipoId?: string
  elementoTipoNombre?: string
  especialidadId?: string
  especialidadNombre?: string
  nivelId?: string
  nivelNombre?: string
  planillaId?: string
  planillaNombre?: string
  procedimientoId?: string
  procedimientoNombre?: string
  prioridad: number
  prioridadTexto?: string
  terminalId?: string
  terminalNombre?: string
  horasBase: number
  impactoBase: number
  createdByNombre?: string
  updatedByNombre?: string
  createdAt: string
  updatedAt: string
}

export interface TareaCreateInput {
  codigo: number
  nombre: string
  proyectoId: string
  elementoTipoId?: string
  nivelId?: string
  planillaId?: string
  procedimientoId?: string
  prioridad: number
  horasBase: number
  impactoBase: number
}

export interface TareaUpdateInput {
  id: string
  codigo: number
  nombre: string
  proyectoId: string
  elementoTipoId?: string
  nivelId?: string
  planillaId?: string
  procedimientoId?: string
  prioridad: number
  horasBase: number
  impactoBase: number
}
