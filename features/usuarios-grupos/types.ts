export interface UsuarioGrupo {
  id: string
  nombre: string
  descripcion: string | null
  cantidadMiembros: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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
}
