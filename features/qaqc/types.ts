/**
 * Tipos del módulo QA/QC (Plan de Inspección y Ensayo). Reflejan los DTOs de
 * `Core/DTOs/Qaqc/QaqcDTOs.cs`; los enums viajan como número.
 */

export interface ApiResponse<T> {
  message: string
  data: T
}

/** Tipo de intervención de una parte en un punto (leyenda "Puntos de Detención"). */
export enum TipoPunto {
  RD = 0,
  IV = 1,
  W = 2,
  HP = 3,
}

export const TIPOS_PUNTO: { valor: TipoPunto; codigo: string; nombre: string; ayuda: string }[] = [
  { valor: TipoPunto.RD, codigo: "RD", nombre: "Revisión de documentos", ayuda: "No se firma sin el documento revisado adjunto." },
  { valor: TipoPunto.IV, codigo: "IV", nombre: "Verificación en proceso", ayuda: "La parte verifica y firma." },
  { valor: TipoPunto.W, codigo: "W", nombre: "Presencia aleatoria", ayuda: "Avisa: entra en la agenda de puntos de inspección." },
  { valor: TipoPunto.HP, codigo: "HP", nombre: "Detención obligatoria", ayuda: "Mientras no se firma, bloquea el punto siguiente y el cierre de la etapa." },
]

export const CODIGO_TIPO: Record<TipoPunto, string> = { 0: "RD", 1: "IV", 2: "W", 3: "HP" }

export enum EstadoPlantilla {
  Borrador = 0,
  Vigente = 1,
  Obsoleta = 2,
}

export const ESTADO_PLANTILLA_LABEL: Record<EstadoPlantilla, string> = { 0: "Borrador", 1: "Vigente", 2: "Obsoleta" }

export enum EstadoPunto {
  Pendiente = 0,
  EnCurso = 1,
  ListoParaFirmar = 2,
  Firmado = 3,
  NoAplica = 4,
  /** Se firmó, pero después se agregaron ítems al alcance: falta cubrirlos y volver a firmar. */
  AmpliacionPendiente = 5,
}

export const ESTADO_PUNTO_LABEL: Record<EstadoPunto, string> = {
  0: "Pendiente",
  1: "En curso",
  2: "Listo para firmar",
  3: "Firmado",
  4: "No aplica",
  5: "Firmado con ampliación pendiente",
}

/** Sobre qué se chequea un punto: una vez, en cada elemento o en cada test pack. */
export enum AlcancePunto {
  Unico = 0,
  PorElemento = 1,
  PorGrupo = 2,
}

export const ALCANCE_LABEL: Record<AlcancePunto, string> = { 0: "Único", 1: "Por elemento", 2: "Por grupo (test pack)" }

export function nombreItems(a: AlcancePunto, n: number) {
  return a === AlcancePunto.PorGrupo ? (n === 1 ? "grupo" : "grupos") : (n === 1 ? "elemento" : "elementos")
}

export enum EstadoItem {
  Pendiente = 0,
  EnCurso = 1,
  Cubierto = 2,
  NoAplica = 3,
}

export const ESTADO_ITEM_LABEL: Record<EstadoItem, string> = { 0: "Pendiente", 1: "Registro sin firmar", 2: "Cubierto", 3: "No aplica" }

export interface PieItem {
  id: string
  elementoId: string | null
  testGroupId: string | null
  etiqueta: string | null
  nombre: string | null
  tipo: string | null
  noAplica: boolean
  noAplicaMotivo: string | null
  estado: EstadoItem
  registroIds: string[]
  /** Si el punto es HP: ya está liberado para el punto siguiente. */
  liberadoHp: boolean | null
  /** Lo frena el HP anterior (no se puede registrar todavía). */
  bloqueadoPor: string | null
  agregadoFecha: string
}

export interface Unidades {
  total: number
  hechas: number
  noAplica: number
}

/** Estados de Registro como los devuelve el backend (enum numérico). */
export const ESTADO_REGISTRO_LABEL: Record<number, string> = {
  0: "Borrador",
  1: "Borrador",
  2: "En proceso",
  3: "Completado",
  4: "Firmado",
  5: "Aprobado",
  6: "Rechazado",
}

export interface PieResumen {
  id: string
  proyectoId: string | null
  codigo: string
  nombre: string
  disciplina: string | null
  revision: string | null
  estado: EstadoPlantilla
  plantillaOrigenId: string | null
  plantillaRevision: string | null
  obra: string | null
  area: string | null
  codigoDatabook: string | null
  orden: number
  hojas: number
  puntos: number
  proyectos: number
  updatedAt: string
}

export interface PieParte {
  id: string
  orden: number
  nombre: string
  rolFirma: string | null
}

export interface PieIntervencion {
  parteId: string
  tipo: TipoPunto
}

export interface PiePlanillaRef {
  planillaId: string
  codigo: string | null
  nombre: string
}

export interface PieRegistroRef {
  id: string
  planillaId: string
  planillaCodigo: string | null
  planillaNombre: string
  estado: number
  esFisico: boolean
  requiereFirma: boolean
  cerrado: boolean
  createdAt: string
  fechaTerminado: string | null
  itemIds: string[]
}

export interface PieFirma {
  id: string
  parteId: string
  parteNombre: string | null
  usuarioId: string
  usuarioNombre: string | null
  empresaNombre: string | null
  fechaFirma: string
  comentario: string | null
  /** False si es anterior a una ampliación del alcance. */
  vigente: boolean
}

export interface PieDocumento {
  id: string
  nombre: string
  nombreArchivo: string
  contentType: string | null
  tamanioBytes: number
  createdAt: string
}

export interface PiePunto {
  id: string
  numero: string | null
  orden: number
  actividad: string
  documentosAplicables: string | null
  procedimientoId: string | null
  procedimientoCodigo: string | null
  procedimientoNombre: string | null
  tipoInforme: string | null
  frecuencia: string | null
  criterioAceptacion: string | null
  observaciones: string | null
  seccionId: string | null
  alcance: AlcancePunto
  alcanceDescripcion: string | null
  intervenciones: PieIntervencion[]
  planillas: PiePlanillaRef[]
  items: PieItem[]
  itemsTotal: number
  itemsCubiertos: number
  itemsNoAplica: number
  itemsLiberadosHp: number | null
  noAplica: boolean
  noAplicaMotivo: string | null
  estadoEjecucion: EstadoPunto
  motivo: string | null
  bloqueadoPor: string | null
  firmas: PieFirma[]
  registros: PieRegistroRef[]
  documentos: PieDocumento[]
}

export interface PieEtapa {
  id: string
  numero: string | null
  nombre: string
  orden: number
  puntos: PiePunto[]
  completa: boolean
  porcentaje: number
}

export interface PieHoja {
  id: string
  numero: string | null
  nombre: string
  orden: number
  etapas: PieEtapa[]
  porcentaje: number
  porcentajePuntos: number
  unidades: Unidades | null
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  firmasFinales: PieFirma[]
  cerrada: boolean
  motivoFirmaFinal: string | null
}

export interface PieSeccion {
  id: string
  numero: string | null
  nombre: string
  orden: number
  hojaId: string | null
  incluyePlan: boolean
  documentos: PieDocumento[]
  registros: number
}

export interface PieDetalle extends PieResumen {
  observaciones: string | null
  abreviaturas: string | null
  partes: PieParte[]
  hojasDetalle: PieHoja[]
  secciones: PieSeccion[]
  /** Principal: por unidades (con puntos por elemento, cada elemento cuenta). */
  porcentaje: number
  /** Por puntos firmados, como en el papel. */
  porcentajePuntos: number
  unidades: Unidades | null
  tieneAlcance: boolean
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  cerrado: boolean
  misPartes: string[]
}

// ── Escritura ──────────────────────────────────────────────────────────────

export interface PieWrite {
  codigo: string
  nombre: string
  disciplina: string | null
  revision: string | null
  obra: string | null
  area: string | null
  codigoDatabook: string | null
  observaciones: string | null
  abreviaturas: string | null
}

export interface PieParteWrite {
  orden?: number | null
  nombre: string
  rolFirma: string | null
}

export interface PieHojaWrite {
  numero: string | null
  nombre: string
  orden?: number | null
}

export interface PieEtapaWrite {
  hojaId?: string
  numero: string | null
  nombre: string
  orden?: number | null
}

export interface PiePuntoWrite {
  etapaId?: string
  numero: string | null
  orden?: number | null
  actividad: string
  documentosAplicables: string | null
  procedimientoId: string | null
  tipoInforme: string | null
  frecuencia: string | null
  criterioAceptacion: string | null
  observaciones: string | null
  seccionId: string | null
  alcance: AlcancePunto
  alcanceDescripcion: string | null
  intervenciones: PieIntervencion[]
  planillaIds: string[]
}

export interface PieSeccionWrite {
  numero: string | null
  nombre: string
  orden?: number | null
  hojaId: string | null
  incluyePlan: boolean
}

// ── Avance y agenda ────────────────────────────────────────────────────────

export interface EtapaAvance {
  numero: string | null
  nombre: string
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  porcentaje: number
  porcentajePuntos: number
  unidades: Unidades | null
}

export interface HojaAvance {
  id: string
  numero: string | null
  nombre: string
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  porcentaje: number
  porcentajePuntos: number
  unidades: Unidades | null
  cerrada: boolean
  etapas: EtapaAvance[]
}

export interface PieAvance {
  id: string
  codigo: string
  nombre: string
  disciplina: string | null
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  porcentaje: number
  porcentajePuntos: number
  unidades: Unidades | null
  tieneAlcance: boolean
  hpPendientes: number
  listosParaFirmar: number
  registrosSinFirmar: number
  cerrado: boolean
  proximoHp: string | null
  hojas: HojaAvance[]
}

export interface QaqcAvance {
  totalPuntos: number
  puntosFirmados: number
  puntosNoAplica: number
  porcentaje: number
  porcentajePuntos: number
  unidades: Unidades | null
  tieneAlcance: boolean
  hpPendientes: number
  listosParaFirmar: number
  pies: PieAvance[]
}

// ── Alcance por elemento ───────────────────────────────────────────────────

export interface Candidato {
  id: string
  etiqueta: string | null
  nombre: string | null
  tipo: string | null
  subsistema: string | null
  yaIncluido: boolean
}

export interface Candidatos {
  items: Candidato[]
  total: number
  tipos: string[]
}

export interface ElementoPunto {
  pieId: string
  pieCodigo: string
  hojaNumero: string | null
  puntoId: string
  puntoNumero: string | null
  actividad: string
  esHp: boolean
  estado: EstadoItem
  bloqueadoPor: string | null
}

export interface ElementoAvance {
  elementoId: string | null
  testGroupId: string | null
  etiqueta: string | null
  nombre: string | null
  tipo: string | null
  total: number
  cubiertos: number
  noAplica: number
  porcentaje: number
  puntos: ElementoPunto[]
}

// ── Alcance del PIE en bloque ──────────────────────────────────────────────

export interface AlcancePuntoPie {
  id: string
  hojaId: string
  hojaNumero: string | null
  hojaTitulo: string
  numero: string | null
  actividad: string
  alcance: AlcancePunto
  alcanceDescripcion: string | null
  items: number
  /** Motivo por el que no admite agregar; null si admite. */
  bloqueado: string | null
}

export interface AlcanceSubsistema {
  id: string
  codigo: string
  nombre: string
  sistema: string | null
  sinAsignar: boolean
}

export interface AlcanceCandidato {
  id: string
  etiqueta: string | null
  nombre: string | null
  tipo: string | null
  subsistema: string | null
  puntoIds: string[]
}

export interface AlcancePie {
  puntos: AlcancePuntoPie[]
  candidatos: AlcanceCandidato[]
  total: number
  tipos: string[]
  subsistemas: AlcanceSubsistema[]
}

export interface AgendaItem {
  pieId: string
  pieCodigo: string
  pieNombre: string
  hojaNumero: string | null
  hojaNombre: string
  etapaNombre: string
  puntoId: string
  puntoNumero: string | null
  actividad: string
  parteId: string
  parteNombre: string
  rolFirma: string | null
  tipo: TipoPunto
  listo: boolean
  motivo: string | null
  esMia: boolean
}

// ── Procedimientos e importación ───────────────────────────────────────────

export interface ProcedimientoRegistro {
  id: string
  orden: number
  codigo: string
  nombre: string | null
  planillaId: string | null
  planillaCodigo: string | null
  planillaNombre: string | null
}

export interface ProcedimientoQaqc {
  id: string
  codigo: string | null
  nombre: string
  revision: string | null
  tieneArchivo: boolean
  registros: ProcedimientoRegistro[]
}

export interface ProcedimientoQaqcWrite {
  codigo: string | null
  revision: string | null
  registros: { codigo: string; nombre: string | null; planillaId: string | null }[]
}

export interface ImportPreview {
  valido: boolean
  errores: string[]
  advertencias: string[]
  codigo: string | null
  nombre: string | null
  disciplina: string | null
  revision: string | null
  partes: string[]
  hojas: { numero: string | null; nombre: string; etapas: number; puntos: number }[]
  etapas: number
  puntos: number
  secciones: number
  codigoExistente: boolean
}
