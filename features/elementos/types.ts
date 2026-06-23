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
  elementoTipoEspecialidadId: string | null
  elementoTipoEspecialidadNombre: string | null
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

/** Coincide con el enum CampoTipoDato del backend. */
export const CAMPO_TIPO_DATO = {
  TEXTO: 1,
  NUMERO: 2,
  FECHA: 3,
  BOOLEAN: 4,
  LISTA: 5,
  IMAGEN: 8,
} as const

export interface ElementoPlanillaDisponible {
  id: string
  codigo: string
  nombre: string
  version: string
}

export interface ElementoValorPrecargado {
  /** null si el campo aún no tiene precargado guardado. */
  id: string | null
  elementoId: string
  planillaCampoId: string
  campoId: string
  campoEtiqueta: string
  /** 1=Texto, 2=Numero, 3=Fecha, 4=Boolean, 5=Lista, 8=Imagen */
  campoTipoDato: number
  orden: number
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
}

export interface ElementoValorPrecargadoUpsertInput {
  planillaCampoId: string
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
}

export interface OpcionListaSimple {
  valor: string
  etiqueta: string
  orden: number
}

/** Valor precargado unificado a nivel Elemento (agrupado por campoId, no por planilla). */
export interface ElementoValorPrecargadoUnificado {
  campoId: string
  campoCodigo: string | null
  campoEtiqueta: string
  /** 1=Texto, 2=Numero, 3=Fecha, 4=Boolean, 5=Lista, 8=Imagen */
  campoTipoDato: number
  campoUnidad: string | null
  /** PlanillaCampos donde aparece este Campo (se replica el valor a todas al guardar). */
  planillaCamposIds: string[]
  planillas: ElementoPlanillaDisponible[]
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
  opciones: OpcionListaSimple[]
}

export interface ElementoValorPrecargadoUnificadoUpsertInput {
  campoId: string
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
}
