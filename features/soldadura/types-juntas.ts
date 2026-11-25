/**
 * Tipos de la Fase 1 del control de soldadura: líneas, piezas, lotes de aporte y
 * juntas. Espejo de `Core/DTOs/Soldadura/SoldaduraJuntasDTOs.cs`. Los enums viajan
 * como número.
 */

export enum TipoLinea {
  Piping = 0,
  Ducto = 1,
  Estructura = 2,
  Recipiente = 3,
}

export const TIPO_LINEA_LABEL: Record<TipoLinea, string> = {
  [TipoLinea.Piping]: "Piping",
  [TipoLinea.Ducto]: "Ducto",
  [TipoLinea.Estructura]: "Estructura",
  [TipoLinea.Recipiente]: "Recipiente",
}

export enum UbicacionJunta {
  Prefabricado = 0,
  Obra = 1,
}

export enum EstadoJunta {
  Registrada = 0,
  Soldada = 1,
  VisualAprobada = 2,
  EnsayoPendiente = 3,
  Aceptada = 4,
  Rechazada = 5,
  Liberada = 6,
}

export const ESTADO_JUNTA: Record<EstadoJunta, { label: string; clase: string }> = {
  [EstadoJunta.Registrada]: { label: "Registrada", clase: "bg-gray-100 text-gray-700 border-gray-200" },
  [EstadoJunta.Soldada]: { label: "Soldada", clase: "bg-blue-50 text-blue-700 border-blue-200" },
  [EstadoJunta.VisualAprobada]: { label: "Visual OK", clase: "bg-sky-50 text-sky-700 border-sky-200" },
  [EstadoJunta.EnsayoPendiente]: { label: "Ensayo pendiente", clase: "bg-amber-50 text-amber-800 border-amber-200" },
  [EstadoJunta.Aceptada]: { label: "Aceptada", clase: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  [EstadoJunta.Rechazada]: { label: "Rechazada", clase: "bg-red-50 text-red-700 border-red-200" },
  [EstadoJunta.Liberada]: { label: "Liberada", clase: "bg-green-100 text-green-800 border-green-300" },
}

export enum OrigenWps {
  SinAsignar = 0,
  Matriz = 1,
  Manual = 2,
}

export enum PasadaJunta {
  Raiz = 0,
  RellenoTerminacion = 1,
  Completa = 2,
}

export const PASADA_LABEL: Record<PasadaJunta, string> = {
  [PasadaJunta.Raiz]: "Raíz",
  [PasadaJunta.RellenoTerminacion]: "Relleno y terminación",
  [PasadaJunta.Completa]: "Completa",
}

export enum ResultadoHabilitacion {
  Habilitado = 0,
  ConAdvertencia = 1,
  NoHabilitado = 2,
}

export enum TipoPieza {
  Spool = 0,
  Tubo = 1,
  Niple = 2,
  Accesorio = 3,
  Plancha = 4,
  Perfil = 5,
  Otro = 6,
}

export const TIPO_PIEZA_LABEL: Record<TipoPieza, string> = {
  [TipoPieza.Spool]: "Spool",
  [TipoPieza.Tubo]: "Tubo",
  [TipoPieza.Niple]: "Niple",
  [TipoPieza.Accesorio]: "Accesorio",
  [TipoPieza.Plancha]: "Plancha",
  [TipoPieza.Perfil]: "Perfil",
  [TipoPieza.Otro]: "Otro",
}

export enum EstadoLote {
  Liberado = 0,
  Segregado = 1,
}

export interface LineaWrite {
  tipo: TipoLinea
  codigo: string
  descripcion?: string | null
  claseId?: string | null
  isometrico?: string | null
  elementoId?: string | null
}

export interface Linea extends LineaWrite {
  id: string
  claseCodigo: string | null
  elementoTag: string | null
  juntas: number
  soldadas: number
}

export interface PiezaWrite {
  tipo: TipoPieza
  codigo: string
  descripcion?: string | null
  material?: string | null
  diametro?: number | null
  serieSchedule?: string | null
  espesor?: number | null
  colada?: string | null
  certificado?: string | null
  piezaOrigenId?: string | null
}

export interface Pieza extends PiezaWrite {
  id: string
  piezaOrigenCodigo: string | null
  coladaEfectiva: string | null
  certificadoEfectivo: string | null
  heredada: boolean
}

export interface LoteWrite {
  clasificacion: string
  fabricante?: string | null
  lote: string
  diametro?: number | null
  certificado?: string | null
  fechaRecepcion?: string | null
  estado: EstadoLote
}

export interface Lote extends LoteWrite {
  id: string
  juntasQueLoUsan: number
}

export interface JuntaSoldadorWrite {
  soldadorProyectoId: string
  pasada: PasadaJunta
  proceso?: string | null
  forzar: boolean
  motivoForzado?: string | null
}

export interface JuntaSoldador extends JuntaSoldadorWrite {
  id: string
  ciclo: number
  cuno: string | null
  nombre: string | null
  resultado: ResultadoHabilitacion
  detalle: string | null
  calificacionId: string | null
}

export interface JuntaWrite {
  lineaId: string
  isometrico?: string | null
  hoja?: string | null
  revisionIsometrico?: string | null
  numero: string
  tipoJunta?: string | null
  diametro?: number | null
  schedule?: string | null
  espesor?: number | null
  material?: string | null
  ubicacion: UbicacionJunta
  progresiva?: string | null
  claseId?: string | null
  wpsId?: string | null
  piezaAId?: string | null
  piezaBId?: string | null
  fechaSoldadura?: string | null
  observaciones?: string | null
  soldadores?: JuntaSoldadorWrite[] | null
  loteIds?: string[] | null
}

export interface Junta {
  id: string
  lineaId: string
  lineaCodigo: string
  identificacion: string
  isometrico: string | null
  hoja: string | null
  revisionIsometrico: string | null
  numero: string
  tipoJunta: string | null
  diametro: number | null
  schedule: string | null
  espesor: number | null
  material: string | null
  ubicacion: UbicacionJunta
  progresiva: string | null
  claseId: string | null
  claseCodigo: string | null
  wpsId: string | null
  wpsTexto: string | null
  origenWps: OrigenWps
  wpsDifiereDeMatriz: boolean
  wpsObservacion: string | null
  piezaAId: string | null
  piezaACodigo: string | null
  piezaBId: string | null
  piezaBCodigo: string | null
  fechaSoldadura: string | null
  estado: EstadoJunta
  cicloActual: number
  observaciones: string | null
  soldadores: JuntaSoldador[]
  lotes: { id: string; texto: string }[]
  habilitacion: ResultadoHabilitacion | null
}

export interface ValidarSoldador {
  soldadorProyectoId: string
  pasada: PasadaJunta
  proceso?: string | null
  wpsId?: string | null
  diametro?: number | null
  espesor?: number | null
  fecha?: string | null
  juntaId?: string | null
}

export interface Habilitacion {
  resultado: ResultadoHabilitacion
  proceso: string | null
  calificacionId: string | null
  detalle: string
}
