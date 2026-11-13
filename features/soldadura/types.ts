/**
 * Tipos del módulo de Calidad de Soldadura. Espejo de `Core/DTOs/Soldadura` del
 * backend. Los enums viajan como número porque la API no registra un convertidor de
 * enums a texto; las etiquetas para mostrarlos están acá al lado.
 *
 * Fechas: las de calificación y vencimiento son fechas sin hora. El backend las
 * serializa en UTC a medianoche, así que se leen con `soloFecha` (los diez primeros
 * caracteres) y nunca con `new Date()`, que en Argentina las corre un día para atrás.
 */

export interface ApiResponse<T> {
  message: string
  data: T
}

// ─── Normas y clases ────────────────────────────────────────────────────

export enum AccionTasaReparacion {
  Avisar = 0,
  EnsayoTotal = 1,
  Suspender = 2,
  Recalificar = 3,
}

export const ACCION_TASA_LABEL: Record<AccionTasaReparacion, string> = {
  [AccionTasaReparacion.Avisar]: "Solo avisar",
  [AccionTasaReparacion.EnsayoTotal]: "Ensayar el 100%",
  [AccionTasaReparacion.Suspender]: "Suspender al soldador",
  [AccionTasaReparacion.Recalificar]: "Pedir recalificación",
}

export interface NormaWrite {
  codigo: string
  descripcion?: string | null
  ensayosAdicionalesPorRechazo: number
  rondasDeAmpliacion: number
  limiteTasaReparacion?: number | null
  accionAlSuperarLimite: AccionTasaReparacion
  mesesContinuidad: number
}

export interface Norma extends NormaWrite {
  id: string
  vigenteDesde: string
  enUso: boolean
}

export interface ClaseWrite {
  codigo: string
  descripcion?: string | null
  normaDiseno?: string | null
  normaEvaluacionId: string
  servicio?: string | null
  porcentajeRT?: number | null
  porcentajePT?: number | null
  otrosEnsayos?: string | null
  requierePwht: boolean
  presionPrueba?: string | null
}

export interface Clase extends ClaseWrite {
  id: string
  normaEvaluacionCodigo: string
  vigenteDesde: string
  enUso: boolean
}

// ─── Matriz ─────────────────────────────────────────────────────────────

export interface MatrizWrite {
  claseId: string
  material?: string | null
  tipoJunta?: string | null
  diametroMin?: number | null
  diametroMax?: number | null
  espesorMin?: number | null
  espesorMax?: number | null
  wpsId: string
  observaciones?: string | null
}

export interface FilaMatriz extends MatrizWrite {
  id: string
  claseCodigo: string
  wpsCodigo: string
  wpsRevision: string
  vigenteDesde: string
}

export interface ConsultaMatriz {
  claseId: string
  material?: string | null
  tipoJunta?: string | null
  diametro?: number | null
  espesor?: number | null
}

export interface ResultadoMatriz {
  encontrado: boolean
  matrizId: string | null
  wpsId: string | null
  wpsCodigo: string | null
  wpsRevision: string | null
  motivo: string | null
}

// ─── WPS y PQR ──────────────────────────────────────────────────────────

export enum EstadoWps {
  Borrador = 0,
  Aprobado = 1,
  Obsoleto = 2,
}

export const ESTADO_WPS_LABEL: Record<EstadoWps, string> = {
  [EstadoWps.Borrador]: "Borrador",
  [EstadoWps.Aprobado]: "Aprobado",
  [EstadoWps.Obsoleto]: "Obsoleto",
}

export interface Pasada {
  id?: string
  orden: number
  pasada: string
  proceso?: string | null
  clasificacionAporte?: string | null
  diametroAporte?: number | null
  amperajeMin?: number | null
  amperajeMax?: number | null
  voltajeMin?: number | null
  voltajeMax?: number | null
  velocidadMin?: number | null
  velocidadMax?: number | null
  polaridad?: string | null
  progresion?: string | null
}

export interface WpsWrite {
  codigo: string
  revision: string
  norma?: string | null
  procesos: string
  pNumbers?: string | null
  espesorMin?: number | null
  espesorMax?: number | null
  diametroMin?: number | null
  diametroMax?: number | null
  posiciones?: string | null
  tipoJunta?: string | null
  precalentamientoMin?: number | null
  interpasadaMax?: number | null
  requierePwht: boolean
  estado: EstadoWps
  pasadas?: Pasada[] | null
  pqrIds?: string[] | null
}

export interface Wps extends WpsWrite {
  id: string
  archivoNombre: string | null
  tieneArchivo: boolean
  pqrsDetalle: { id: string; codigo: string }[]
  enUso: boolean
}

export interface PqrWrite {
  codigo: string
  norma?: string | null
  fecha?: string | null
  descripcion?: string | null
}

export interface Pqr extends PqrWrite {
  id: string
  archivoNombre: string | null
  tieneArchivo: boolean
  wps: string[]
}

// ─── Personas ───────────────────────────────────────────────────────────

export enum EstadoVencimiento {
  Vigente = 0,
  PorVencer = 1,
  Vencida = 2,
}

export enum TipoVencimiento {
  CalificacionSoldador = 0,
  PersonalEnd = 1,
}

export interface SoldadorWrite {
  nombre: string
  documento: string
  empresa?: string | null
  observaciones?: string | null
  cuno: string
  desde?: string | null
}

export interface CalificacionWrite {
  numero?: string | null
  norma: string
  proceso: string
  pNumber?: string | null
  fNumber?: string | null
  posiciones?: string | null
  diametroMin?: number | null
  espesorMin?: number | null
  espesorMax?: number | null
  conRespaldo?: boolean | null
  wpsReferencia?: string | null
  fechaCalificacion: string
  vence?: string | null
  ultimoUsoDeclarado?: string | null
}

export interface Calificacion extends CalificacionWrite {
  id: string
  archivoNombre: string | null
  tieneArchivo: boolean
  continuidadHasta: string
  estado: EstadoVencimiento
}

export interface Soldador {
  /** Id de la habilitación en el proyecto: el que usan los endpoints. */
  id: string
  soldadorId: string
  nombre: string
  documento: string
  empresa: string | null
  observaciones: string | null
  cuno: string
  desde: string | null
  hasta: string | null
  calificaciones: Calificacion[]
}

export interface PersonalEndWrite {
  nombre: string
  documento?: string | null
  empresa?: string | null
  metodo: string
  nivel: string
  normaCertificacion?: string | null
  numeroCertificado?: string | null
  vence?: string | null
}

export interface PersonalEnd extends PersonalEndWrite {
  id: string
  archivoNombre: string | null
  tieneArchivo: boolean
  estado: EstadoVencimiento
}

export const METODOS_END = ["RT", "UT", "PT", "MT", "VT", "PMI", "ET", "LT"] as const
export const NIVELES_END = ["I", "II", "III"] as const

// ─── Vencimientos ───────────────────────────────────────────────────────

export interface Vencimiento {
  tipo: TipoVencimiento
  id: string
  personaId: string
  persona: string
  cuno: string | null
  detalle: string
  fechaLimite: string
  motivo: string
  diasRestantes: number
  estado: EstadoVencimiento
}

export interface Vencimientos {
  vencidas: number
  porVencer: number
  vigentes: number
  soldadoresSinCalificacionVigente: string[]
  items: Vencimiento[]
}

// ─── Archivos e importación ─────────────────────────────────────────────

export type TipoArchivo = "Wps" | "Pqr" | "Calificacion" | "PersonalEnd" | "Informe"

export interface ResumenHoja {
  creates: number
  updates: number
  deletes: number
  total: number
}

export interface ImportError {
  hoja: string
  filaExcel: number
  columna: string | null
  mensaje: string
}

export interface ImportPreview {
  /** Resumen por hoja, en el orden en que se aplican. */
  hojas: Record<string, ResumenHoja>
  errores: ImportError[]
}

export interface ImportResultado {
  aplicado: boolean
  mensaje: string
  preview: ImportPreview
}

// ─── Utilidades ─────────────────────────────────────────────────────────

/** "2026-06-10T00:00:00Z" → "2026-06-10". Vacío si no hay fecha. */
export function soloFecha(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ""
}

/** "2026-06-10..." → "10/06/2026". Guion si no hay fecha. */
export function fechaCorta(iso: string | null | undefined): string {
  const f = soloFecha(iso)
  if (!f) return "—"
  const [a, m, d] = f.split("-")
  return `${d}/${m}/${a}`
}

/** Rango legible: "2 – 24", "≥ 2", "≤ 24" o "cualquiera". */
export function rango(min: number | null | undefined, max: number | null | undefined, unidad = ""): string {
  const u = unidad ? ` ${unidad}` : ""
  if (min != null && max != null) return `${min} – ${max}${u}`
  if (min != null) return `≥ ${min}${u}`
  if (max != null) return `≤ ${max}${u}`
  return "cualquiera"
}
