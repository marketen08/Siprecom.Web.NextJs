/**
 * Tipos del módulo de paro de planta.
 * Ver Siprecom.Server.Api/Docs/PLAN-MODULO-PARO-PLANTA.md.
 *
 * Todos los porcentajes vienen en tanto por uno (0..1); el formateo a % es del
 * lado del front.
 */

export type EstadoParada = "SIN_CONFIGURAR" | "PROGRAMADA" | "EN_CURSO" | "CERRADA"
export type Semaforo = "ADELANTADO" | "EN_TIEMPO" | "ATRASADO"

/** De dónde sale la curva esperada. */
export type ModoCurva = "Plan" | "CurvaS"

export interface ParadaConfig {
  inicio: string | null
  finPlan: string | null
  finReal: string | null
  curvaK: number
  umbralSemaforo: number
  umbralCobertura: number
  usarImpacto: boolean
  estado: EstadoParada
  horasPlan: number | null

  enviarMails: boolean
  mailsDestinatarios: string | null
  mailsCadaHoras: number
  mailsHasta: string | null
  /** Solo lectura. */
  ultimoMailEnviado: string | null
  /** Cuántas direcciones se entendieron de la lista cargada. */
  mailsDestinatariosValidos: number
}

export interface ParadaConfigUpdate {
  inicio: string | null
  finPlan: string | null
  finReal: string | null
  curvaK: number
  umbralSemaforo: number
  umbralCobertura: number
  usarImpacto: boolean

  enviarMails: boolean
  mailsDestinatarios: string | null
  mailsCadaHoras: number
  mailsHasta: string | null
}

export interface ParadaKpi {
  titulo: string
  ahora: string
  inicio: string
  finPlan: string
  finReal: string | null

  horasPlan: number
  /** No está topeada al fin planificado: si la parada se pasó, sigue creciendo. */
  horasTranscurridas: number
  porcTiempo: number

  pesoTotal: number
  pesoHecho: number
  pesoEsperado: number

  realP: number
  esperadoP: number
  deltaP: number

  ritmoPorHora: number
  /** Null al principio de la parada, donde el cociente se dispara. */
  prediccionP: number | null
  /** Null si el ritmo es cero o ya está todo hecho. */
  finProyectado: string | null

  semaforo: Semaforo
  modo: ModoCurva
  cobertura: number
  usarImpacto: boolean

  tareasTotal: number
  tareasHechas: number
  /** False cuando todas las tareas pesan igual: el "ponderado" es en realidad un conteo. */
  pesosDiferenciados: boolean
}

export interface ParadaSeriePunto {
  hora: string
  /** Null en los puntos futuros — la línea tiene que cortarse ahí, no caer a cero. */
  realP: number | null
  esperadoP: number
}

export interface ParadaSerie {
  puntos: ParadaSeriePunto[]
  /** Horas entre puntos. Mayor a 1 cuando la parada es larga y se raleó. */
  pasoHoras: number
  modo: ModoCurva
  /** Cerradas sin fecha, imputadas al momento de evaluación. */
  hechasSinFecha: number
}

export interface ParadaDashboard {
  kpi: ParadaKpi
  serie: ParadaSerie
}
