import type { Proyecto } from "@/features/proyectos/types"

export interface Sistema {
  id: string
  codigo: string
  nombre: string
  proyectoId: string
  proyecto: Proyecto
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface SistemaCreateInput {
  codigo: string
  nombre: string
}

export interface SistemaUpdateInput {
  codigo: string
  nombre: string
}
