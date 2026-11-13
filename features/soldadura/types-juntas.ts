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
