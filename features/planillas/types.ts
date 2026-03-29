export interface Planilla {
  id: string
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  nombreArchivoId?: string
  version?: string
  requiereFirma: boolean
  permiteAdjuntos: boolean
  generaPdfFinal: boolean
  createdByNombre?: string
  updatedByNombre?: string
  createdAt: string
  updatedAt: string
}

export interface PlanillaSeccion {
  id: string
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface CampoOpcion {
  id: string
  campoId: string
  valor: string
  etiqueta: string
  orden: number
}

export type CampoTipoDato = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const CAMPO_TIPO_DATO: Record<CampoTipoDato, string> = {
  1: "Texto",
  2: "Número",
  3: "Fecha",
  4: "Boolean",
  5: "Lista",
  6: "Firma",
  7: "Adjunto",
}

export interface PlanillaCampoDetalle {
  id: string
  planillaId: string
  planillaSeccionId?: string
  planillaSeccionNombre?: string
  campoId: string
  campoCodigo?: string
  campoNombre?: string
  campoEtiqueta?: string
  campoTipoDato: CampoTipoDato
  campoTipoDatoNombre?: string
  campoUnidad?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
  opciones: CampoOpcion[]
}

export interface PlanillaEstructura {
  planilla: Planilla
  secciones: PlanillaSeccion[]
  campos: PlanillaCampoDetalle[]
}

export interface PlanillaCreateInput {
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  version?: string
  requiereFirma?: boolean
  permiteAdjuntos?: boolean
  generaPdfFinal?: boolean
}

export interface PlanillaUpdateInput {
  id: string
  codigo?: string
  nombre: string
  descripcion?: string
  observaciones?: string
  version?: string
  requiereFirma?: boolean
  permiteAdjuntos?: boolean
  generaPdfFinal?: boolean
}

export interface PlanillaSeccionCreateInput {
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface PlanillaSeccionUpdateInput {
  id: string
  planillaId: string
  nombre: string
  descripcion?: string
  orden: number
}

export interface PlanillaCampoCreateInput {
  planillaId: string
  campoId: string
  planillaSeccionId?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
}

export interface PlanillaCampoUpdateInput {
  id: string
  planillaId: string
  campoId: string
  planillaSeccionId?: string
  orden: number
  esObligatorio: boolean
  visible: boolean
  soloLectura: boolean
  valorDefault?: string
}
