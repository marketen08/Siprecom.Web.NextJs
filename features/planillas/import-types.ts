import type { CampoTipoDato } from "./types"

export interface CampoImportado {
  nombre: string
  etiqueta: string
  tipoDato: CampoTipoDato
  esObligatorio: boolean
  opciones?: string[] // para tipo Lista (5)
}

export interface SeccionImportada {
  nombre: string
  campos: CampoImportado[]
}

export interface PlanillaImportada {
  nombre: string
  secciones: SeccionImportada[]
}

// Payload que el cliente envía a /api/ai/planilla-desde-excel
export interface ExcelParsePayload {
  nombreArchivo: string
  filas: string[][] // matriz de celdas como strings
}
