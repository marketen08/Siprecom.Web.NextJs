/**
 * Tipos del módulo de Calidad (No Conformidades / SAC / SOM).
 *
 * Los IDs de estado son fijos: vienen del seed del backend
 * (NoConformidadEstadoIds). Si cambian allá, hay que cambiarlos acá.
 */

export const NC_ESTADO_IDS = {
  EVALUACION: "estado-nc-evaluacion",
  NUEVO: "estado-nc-nuevo",
  INVESTIGACION: "estado-nc-investigacion",
  REVISION: "estado-nc-revision",
  INDICADOR_EFICACIA: "estado-nc-indicador",
  ESPERA_RESULTADO: "estado-nc-espera",
  FINALIZADO: "estado-nc-finalizado",
  CANCELADO: "estado-nc-cancelado",
} as const

/** Etiqueta legible por estado. El backend guarda el nombre en MAYUS_CON_GUIONES. */
export const NC_ESTADO_LABEL: Record<string, string> = {
  EVALUACION: "Evaluación",
  NUEVO: "Nuevo",
  INVESTIGACION: "Investigación",
  REVISION: "Revisión",
  INDICADOR_EFICACIA: "Definición de eficacia",
  ESPERA_RESULTADO: "Espera de resultado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
}

/**
 * Qué está pasando en cada etapa, en una frase. Se muestra en el detalle para
 * que quien abre el informe entienda de quién depende el próximo paso sin
 * tener que conocer el circuito.
 */
export const NC_ESTADO_NARRATIVA: Record<string, string> = {
  EVALUACION: "El área de seguimiento está analizando si el informe corresponde.",
  NUEVO: "El área afectada tiene que registrar la acción inmediata de contención.",
  INVESTIGACION: "El área afectada está documentando causa raíz y acción correctiva.",
  REVISION: "El área de seguimiento revisa el cierre: aprueba o rechaza con motivo.",
  INDICADOR_EFICACIA: "El área de seguimiento define qué se mide y cuándo para probar la eficacia.",
  ESPERA_RESULTADO: "Esperando la fecha comprometida para medir la eficacia.",
  FINALIZADO: "Informe cerrado: la acción correctiva se midió.",
  CANCELADO: "Informe descartado.",
}

export const NC_ESTADO_COLOR: Record<string, string> = {
  EVALUACION: "bg-yellow-100 text-yellow-800",
  NUEVO: "bg-blue-100 text-blue-700",
  INVESTIGACION: "bg-purple-100 text-purple-700",
  REVISION: "bg-orange-100 text-orange-800",
  INDICADOR_EFICACIA: "bg-cyan-100 text-cyan-800",
  ESPERA_RESULTADO: "bg-indigo-100 text-indigo-700",
  FINALIZADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
}

/** Severidad — enum del backend (1 = Menor, 2 = Mayor). */
export const NC_SEVERIDAD: Record<number, string> = {
  1: "Menor",
  2: "Mayor",
}

export const NC_SEVERIDAD_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-red-100 text-red-700",
}

/** Estados terminales: no admiten más acciones del workflow. */
export const NC_ESTADOS_TERMINALES: string[] = [
  NC_ESTADO_IDS.FINALIZADO,
  NC_ESTADO_IDS.CANCELADO,
]

// ── Entidades ──────────────────────────────────────────────────────────────

export interface NoConformidadTipo {
  id: string
  /** Prefijo del correlativo: NC / SAC / SOM. */
  codigo: string
  nombre: string
  descripcion: string | null
  bloqueaCertificado: boolean
  orden: number
}

export interface NoConformidadMotivo {
  id: string
  nombre: string
}

/**
 * Una transición del workflow con su firma. Es la fuente de verdad de la
 * trazabilidad: el "quién y cuándo" de cada etapa sale de acá, no de campos
 * en el informe. Un informe que rebotó entre Revisión e Investigación tiene
 * una fila por cada rebote.
 */
export interface NoConformidadHistorial {
  id: string
  estadoAnteriorId: string | null
  estadoAnteriorNombre: string | null
  estadoNuevoId: string
  estadoNuevoNombre: string
  accion: number | null
  accionTexto: string | null
  comentario: string | null
  fecha: string
  usuarioId: string | null
  usuarioNombre: string | null
  /** Imagen de la firma en base64 al momento de firmar. Null si no tenía firma cargada. */
  datosFirma: string | null
  nombreFirmante: string | null
  empresaNombre: string | null
  empresaLogoUrl: string | null
}

export interface NoConformidadComentario {
  id: string
  comentario: string
  createdAt: string
  createdById: string | null
  createdByNombre: string | null
}

export interface NoConformidadAdjunto {
  id: string
  fileName: string
  contentType: string | null
  url: string | null
  sizeBytes: number
  createdAt: string
  createdByNombre: string | null
}

export interface NoConformidadPendienteVinculado {
  pendienteId: string
  pendienteCodigo: number
  pendienteCodigoFormateado: string
  descripcion: string | null
  estadoNombre: string | null
  /** True en el pendiente que originó el informe. Hay como máximo uno. */
  esOrigen: boolean
}

export interface NoConformidad {
  id: string
  codigo: number
  codigoFormateado: string

  tipoId: string
  tipoCodigo: string
  tipoNombre: string
  /** Si es true, un informe abierto de este tipo bloquea la emisión de certificados. */
  tipoBloqueaCertificado: boolean

  titulo: string
  severidad: number
  severidadTexto: string

  proyectoId: string
  estadoId: string
  estadoNombre: string

  motivoId: string | null
  motivoNombre: string | null

  grupoAfectadoId: string
  grupoAfectadoNombre: string
  grupoSeguimientoId: string
  grupoSeguimientoNombre: string

  subSistemaId: string | null
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  elementoId: string | null
  elementoTag: string | null
  especialidadId: string | null
  especialidadNombre: string | null

  fechaDeteccion: string
  fechaCompromiso: string | null
  detectadoPorId: string | null
  detectadoPorNombre: string | null

  accionInmediata: string | null
  causaRaiz: string | null
  accionCorrectiva: string | null
  planMejora: string | null
  objetivoEficacia: string | null
  fechaEvaluacionEficacia: string | null
  resultadoEficacia: string | null
  fueEficaz: boolean | null

  /** Informe del que éste se generó, cuando la acción anterior no fue eficaz. */
  generadaDesdeNoConformidadId: string | null
  generadaDesdeCodigoFormateado: string | null
  /** Informe que ÉSTE generó. Se resuelve por query inversa en el backend. */
  generoNoConformidadId: string | null
  generoCodigoFormateado: string | null

  fechaCierre: string | null
  fechaCancelacion: string | null

  esTerminal: boolean
  /** Fecha de medición de eficacia vencida sin resultado cargado. */
  eficaciaVencida: boolean
  cantidadPendientesVinculados: number

  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface NoConformidadDetalle extends NoConformidad {
  comentarios: NoConformidadComentario[]
  adjuntos: NoConformidadAdjunto[]
  historial: NoConformidadHistorial[]
  pendientesVinculados: NoConformidadPendienteVinculado[]
}

// ── Filtros ────────────────────────────────────────────────────────────────

export interface NoConformidadFilterInput {
  search?: string
  tipoId?: string
  estadoId?: string
  motivoId?: string
  severidad?: number
  grupoAfectadoId?: string
  grupoSeguimientoId?: string
  subSistemaId?: string
  elementoId?: string
  especialidadId?: string
  detectadoPorId?: string
  fechaDeteccionDesde?: string
  fechaDeteccionHasta?: string
  soloAbiertos?: boolean
  soloMios?: boolean
  soloEficaciaVencida?: boolean
  orderBy?: string
  orderDescending?: boolean
}

// ── Acciones del workflow ──────────────────────────────────────────────────

/**
 * Slug de cada acción, tal como lo espera el backend. La clave es el estado
 * DESDE el que se puede ejecutar — así la UI sabe qué ofrecer sin duplicar el
 * mapa de transiciones.
 */
export const NC_ACCIONES = {
  evaluar: "evaluar",
  accionInmediata: "accion-inmediata",
  investigacion: "investigacion",
  aprobar: "aprobar",
  rechazar: "rechazar",
  objetivoEficacia: "eficacia/objetivo",
  resultadoEficacia: "eficacia/resultado",
  cancelar: "cancelar",
} as const

export type NcAccionSlug = (typeof NC_ACCIONES)[keyof typeof NC_ACCIONES]

/** Qué acción corresponde al estado actual. Null en estados terminales. */
export function accionDelEstado(estadoId: string): NcAccionSlug | null {
  switch (estadoId) {
    case NC_ESTADO_IDS.EVALUACION:
      return NC_ACCIONES.evaluar
    case NC_ESTADO_IDS.NUEVO:
      return NC_ACCIONES.accionInmediata
    case NC_ESTADO_IDS.INVESTIGACION:
      return NC_ACCIONES.investigacion
    case NC_ESTADO_IDS.REVISION:
      return NC_ACCIONES.aprobar
    case NC_ESTADO_IDS.INDICADOR_EFICACIA:
      return NC_ACCIONES.objetivoEficacia
    case NC_ESTADO_IDS.ESPERA_RESULTADO:
      return NC_ACCIONES.resultadoEficacia
    default:
      return null
  }
}
