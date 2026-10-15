import type { TipoCertificado } from "@/features/certificados/types"

export interface ElementoTipo {
  id: string
  nombre: string
  especialidadId: string
  especialidadNombre: string | null
  especialidadCodigo: string | null
  especialidadColor: string | null
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
  planillaEncabezadoNombre: string | null
  /**
   * Equipo de administracion dueno. Null = global: lo ven y lo usan todos los proyectos y lo
   * administra un AdminGlobal. El nombre del tipo es unico POR equipo, asi que dos equipos
   * pueden tener su propia "Valvula".
   */
  equipoId?: string | null
  equipoNombre?: string | null
  /**
   * Si quien pidio la lista puede editar este tipo. Lo resuelve el backend —el front no sabe
   * a que equipos pertenece el usuario— y con eso la pantalla deshabilita las acciones en vez
   * de dejar que el error aparezca al guardar.
   */
  puedeEditar?: boolean
  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface ElementoTipoCreateInput {
  nombre: string
  especialidadId: string
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
}

export interface ElementoTipoUpdateInput {
  nombre: string
  especialidadId: string
  horasAdicionalesDefault: number
  impactoFactorDefault: number
  esSintetico: boolean
  certificadoQueAlimenta: TipoCertificado | null
  permiteAgrupar: boolean
  tiposFisicosPermitidosIds: string[]
  planillaEncabezadoId: string | null
}
