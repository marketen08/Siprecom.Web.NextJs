// Tipos espejados de Core/DTOs/ProyectoIfc/ProyectoIfcArchivoDTO.cs

export interface ProyectoIfcArchivo {
  id: string
  proyectoId: string
  nombre: string
  disciplina: string | null
  nombreArchivo: string | null
  contentType: string | null
  tamanioBytes: number | null
  createdAt: string
  createdByNombre: string | null
}

export interface ProyectoIfcArchivoCreateInput {
  nombre: string
  disciplina?: string
  archivo: File
}

export interface ProyectoIfcArchivoUrl {
  url: string
  nombreArchivo: string | null
  expiraEnMinutos: number
}
