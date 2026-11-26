/**
 * Tipos de la Fase 2: inspección visual, ensayos, lotes, solicitudes, informes,
 * reparaciones, control de parámetros, tasa de reparación y configuración. Espejo de
 * `Core/DTOs/Soldadura/SoldaduraInspeccionDTOs.cs`.
 */
import type { AccionTasaReparacion } from "@/features/soldadura/types"
import type { EstadoJunta, JuntaSoldador, JuntaSoldadorWrite, PasadaJunta } from "@/features/soldadura/types-juntas"

export enum MetodoEnsayo {
  VT = 0,
  RT = 1,
  UT = 2,
  PT = 3,
  MT = 4,
  PMI = 5,
  Dureza = 6,
}

export const METODO_LABEL: Record<MetodoEnsayo, string> = {
  [MetodoEnsayo.VT]: "VT", [MetodoEnsayo.RT]: "RT", [MetodoEnsayo.UT]: "UT", [MetodoEnsayo.PT]: "PT",
  [MetodoEnsayo.MT]: "MT", [MetodoEnsayo.PMI]: "PMI", [MetodoEnsayo.Dureza]: "Dureza",
}

/** Métodos de laboratorio con los que se arman lotes. */
export const METODOS_LOTE = [MetodoEnsayo.RT, MetodoEnsayo.UT, MetodoEnsayo.PT, MetodoEnsayo.MT]

export enum MotivoEnsayo {
  Inspeccion = 0,
  Muestra = 1,
  Ampliacion = 2,
  Total = 3,
  Reensayo = 4,
  PostPwht = 5,
  Pedido = 6,
}

export const MOTIVO_LABEL: Record<MotivoEnsayo, string> = {
  [MotivoEnsayo.Inspeccion]: "Inspección",
  [MotivoEnsayo.Muestra]: "Muestra",
  [MotivoEnsayo.Ampliacion]: "Ampliación",
  [MotivoEnsayo.Total]: "Lote completo",
  [MotivoEnsayo.Reensayo]: "Reensayo",
  [MotivoEnsayo.PostPwht]: "Post PWHT",
  [MotivoEnsayo.Pedido]: "Pedido",
}

export enum ResultadoEnsayo {
  Pendiente = 0,
  Aceptada = 1,
  Rechazada = 2,
}

export enum EstadoLote {
  Abierto = 0,
  Ampliado = 1,
  Total = 2,
  Liberado = 3,
}

export const ESTADO_LOTE: Record<EstadoLote, { label: string; clase: string }> = {
  [EstadoLote.Abierto]: { label: "Abierto", clase: "bg-blue-50 text-blue-700 border-blue-200" },
  [EstadoLote.Ampliado]: { label: "Ampliado", clase: "bg-amber-50 text-amber-800 border-amber-200" },
  [EstadoLote.Total]: { label: "Ensayo total", clase: "bg-red-50 text-red-700 border-red-200" },
  [EstadoLote.Liberado]: { label: "Liberado", clase: "bg-green-100 text-green-800 border-green-300" },
}

export enum SeleccionLote {
  NoSeleccionada = 0,
  Muestra = 1,
  Ampliacion = 2,
  Total = 3,
}

export const SELECCION_LABEL: Record<SeleccionLote, string> = {
  [SeleccionLote.NoSeleccionada]: "—",
  [SeleccionLote.Muestra]: "Muestra",
  [SeleccionLote.Ampliacion]: "Ampliación",
  [SeleccionLote.Total]: "Total",
}

export interface ResultadoCarga {
  procesadas: number
  rechazadas: number
  noConformidadesCreadas: number
  avisos: string[]
}

export interface VisualItem {
  juntaId: string
  resultado: ResultadoEnsayo
  defecto?: string | null
  observaciones?: string | null
}

export interface Visual {
  fecha: string
  inspector?: string | null
  items: VisualItem[]
}

export interface ReparacionWrite {
  defecto?: string | null
  fecha: string
  wpsId?: string | null
  observaciones?: string | null
  soldadores: JuntaSoldadorWrite[]
}

export interface ControlWrite {
  soldadorProyectoId?: string | null
  pasada: PasadaJunta
  proceso?: string | null
  aporte?: string | null
  amperaje?: number | null
  voltaje?: number | null
  velocidad?: number | null
  polaridad?: string | null
  temperaturaPrecalentamiento?: number | null
  temperaturaInterpasada?: number | null
  fecha: string
  inspector?: string | null
}

export interface Control extends ControlWrite {
  id: string
  juntaId: string
  identificacion: string
  cuno: string | null
  wpsTexto: string | null
  fueraDeRango: boolean
  detalle: string
}

export interface Ensayo {
  id: string
  juntaId: string
  identificacion: string
  lineaCodigo: string
  ciclo: number
  metodo: MetodoEnsayo
  motivo: MotivoEnsayo
  resultado: ResultadoEnsayo
  fecha: string | null
  defecto: string | null
  inspector: string | null
  loteNumero: number | null
  solicitudNumero: number | null
  informeNumero: string | null
  noConformidadId: string | null
  diametro: number | null
  schedule: string | null
}

export interface Ciclo {
  ciclo: number
  fecha: string | null
  defecto: string | null
  wpsTexto: string | null
  soldadores: JuntaSoldador[]
  ensayos: Ensayo[]
}

export interface Historial {
  juntaId: string
  identificacion: string
  estado: EstadoJunta
  cicloActual: number
  ciclos: Ciclo[]
  controles: Control[]
}

export interface ArmarLotes {
  metodo: MetodoEnsayo
  soldadorProyectoId?: string | null
  lineaId?: string | null
}

export interface LoteJunta {
  juntaId: string
  identificacion: string
  seleccion: SeleccionLote
  ronda: number
  resultado: ResultadoEnsayo | null
  informe: string | null
  fecha: string | null
  estadoJunta: EstadoJunta
}

export interface Lote {
  id: string
  numero: number
  soldadorProyectoId: string
  cuno: string | null
  soldador: string | null
  metodo: MetodoEnsayo
  claseCodigo: string | null
  porcentaje: number
  ronda: number
  estado: EstadoLote
  juntas: number
  elegidas: number
  rechazos: number
  pendientes: number
  creadoEn: string
  detalle: LoteJunta[] | null
}

export interface SolicitudWrite {
  fecha: string
  laboratorio?: string | null
  solicitadoPor?: string | null
  observaciones?: string | null
  ensayoIds: string[]
}

export interface Solicitud {
  id: string
  numero: number
  fecha: string
  laboratorio: string | null
  solicitadoPor: string | null
  observaciones: string | null
  ensayos: number
  conResultado: number
}

export interface InformeItem {
  ensayoId?: string | null
  juntaId?: string | null
  resultado: ResultadoEnsayo
  defecto?: string | null
}

export interface InformeWrite {
  numero: string
  metodo: MetodoEnsayo
  fecha: string
  laboratorio?: string | null
  personalEndId?: string | null
  items: InformeItem[]
}

export interface Informe {
  id: string
  numero: string
  metodo: MetodoEnsayo
  fecha: string
  laboratorio: string | null
  evaluador: string | null
  juntas: number
  rechazadas: number
  tieneArchivo: boolean
  archivoNombre: string | null
}

export interface TasaReparacion {
  soldadorProyectoId: string
  cuno: string
  soldador: string
  juntasSoldadas: number
  ensayadas: number
  rechazadas: number
  tasa: number | null
  limite: number | null
  accion: AccionTasaReparacion | null
  superaLimite: boolean
}

export interface Configuracion {
  crearNcPorRechazo: boolean
  ncTipoId: string | null
  ncGrupoAfectadoId: string | null
  ncGrupoSeguimientoId: string | null
  moduloNcHabilitado: boolean
}
