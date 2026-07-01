export const TIPO_TEST_GROUP = {
  PRESSURE: 1,
  BASIC_FUNCTION: 2,
} as const

export type TipoTestGroup = (typeof TIPO_TEST_GROUP)[keyof typeof TIPO_TEST_GROUP]

export const ESTADO_TEST_GROUP = {
  BORRADOR: 1,
  ACTIVO: 2,
  COMPLETADO: 3,
  CERRADO: 4,
} as const

export type EstadoTestGroup = (typeof ESTADO_TEST_GROUP)[keyof typeof ESTADO_TEST_GROUP]

export const METODO_PRUEBA = {
  HIDROSTATICA: 1,
  NEUMATICA: 2,
  VACIO: 3,
} as const

export type MetodoPrueba = (typeof METODO_PRUEBA)[keyof typeof METODO_PRUEBA]

export const TIPO_PRUEBA_FUNCIONAL = {
  FTS: 1,
  OTS: 2,
} as const

export type TipoPruebaFuncional = (typeof TIPO_PRUEBA_FUNCIONAL)[keyof typeof TIPO_PRUEBA_FUNCIONAL]

export interface TestGroup {
  id: string
  proyectoId: string
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  tipo: TipoTestGroup
  tipoTexto: string
  codigo: string
  nombre: string
  descripcion: string | null
  estado: EstadoTestGroup
  estadoTexto: string
  // PRESSURE
  presion: number | null
  fluido: string | null
  pidReferencia: string | null
  metodoPrueba: MetodoPrueba | null
  limitesBateria: string | null
  // BASIC_FUNCTION
  tipoPruebaFuncional: TipoPruebaFuncional | null
  alcanceFuncional: string | null

  cantidadElementos: number
  cantidadTareas: number
  cantidadTareasTerminales: number
  porcentajeAvance: number

  createdAt: string
  createdByNombre: string
  updatedAt: string
  updatedByNombre: string
  isActive: boolean
}

export interface TestGroupCreateInput {
  subSistemaId: string
  tipo: TipoTestGroup
  codigo: string
  nombre: string
  descripcion?: string | null
  presion?: number | null
  fluido?: string | null
  pidReferencia?: string | null
  metodoPrueba?: MetodoPrueba | null
  limitesBateria?: string | null
  tipoPruebaFuncional?: TipoPruebaFuncional | null
  alcanceFuncional?: string | null
}

export interface TestGroupUpdateInput {
  subSistemaId: string
  codigo: string
  nombre: string
  descripcion?: string | null
  presion?: number | null
  fluido?: string | null
  pidReferencia?: string | null
  metodoPrueba?: MetodoPrueba | null
  limitesBateria?: string | null
  tipoPruebaFuncional?: TipoPruebaFuncional | null
  alcanceFuncional?: string | null
}
