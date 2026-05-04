export const PRIORIDAD = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Urgente",
} as const

export interface Elemento {
  id: string
  codigo: number
  tag: string
  nombre: string
  elementoTipoId: string
  elementoTipoNombre: string | null
  elementoTipoEspecialidad: string | null
  prioridad: number
  prioridadTexto: string
  sistemaId: string
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  proyectoId: string
  terminalId: string
  horasAdicionales: number
  impactoFactor: number
  pid: string
  testpack: string
  observaciones: string
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ElementoCreateInput {
  tag: string
  nombre: string
  elementoTipoId: string
  prioridad: number
  sistemaId: string
  subSistemaId: string
  horasAdicionales: number
  impactoFactor: number
  pid: string
  testpack: string
  observaciones: string
}

export interface ElementoUpdateInput {
  tag: string
  nombre: string
  elementoTipoId: string
  prioridad: number
  sistemaId: string
  subSistemaId: string
  proyectoId: string
  terminalId: string
  codigo: number
  horasAdicionales: number
  impactoFactor: number
  pid: string
  testpack: string
  observaciones: string
}
