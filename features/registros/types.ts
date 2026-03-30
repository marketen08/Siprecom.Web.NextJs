export interface RegistroValor {
  id: string
  registroId: string
  planillaCampoId: string
  campoNombre: string
  campoEtiqueta: string
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
  observaciones: string | null
  fechaCarga: string
  cargadoPor: string
  cargadoPorNombre: string
}

export interface RegistroArchivo {
  id: string
  registroId: string
  nombreArchivo: string
  contentType: string
  tamanioBytes: number
  posicion: number
  revision: number
  url: string
  urlExpiraEn: string | null
}

export const ESTADO_REGISTRO: Record<number, string> = {
  1: "BORRADOR",
  2: "EN PROCESO",
  3: "COMPLETADO",
  4: "FIRMADO",
  5: "APROBADO",
  6: "RECHAZADO",
}

export interface RegistroDetalle {
  id: string
  elementoTareaId: string
  planillaId: string
  proyectoId: string
  terminalId: string
  estado: number
  esFisico: boolean
  fechaInicio: string
  fechaTerminado: string | null
  observaciones: string | null
  porcentajeCompletitud: number
  camposPendientes: number
  validacionPasada: boolean
  valores: RegistroValor[]
  archivos: RegistroArchivo[]
}

export interface RegistroValorInput {
  planillaCampoId: string
  valorTexto?: string | null
  valorNumero?: number | null
  valorFecha?: string | null
  valorBit?: boolean | null
  observaciones?: string | null
}

export interface CompletarDigitalInput {
  fechaTerminado?: string | null
  observaciones?: string | null
  valores: RegistroValorInput[]
}

export interface RegistroFirmaSlot {
  id: string
  orden: number
  rolNombre: string
  descripcion: string | null
  esObligatorio: boolean
  firmaId: string | null
  firmadoPor: string | null
  nombreFirmante: string | null
  fechaFirma: string | null
  observaciones: string | null
}

export interface RegistroFirmasStatus {
  registroId: string
  estadoRegistro: string
  todasLasFirmasCompletadas: boolean
  totalFirmas: number
  firmasCompletadas: number
  firmasPendientes: number
  slots: RegistroFirmaSlot[]
}

export interface FirmarRegistroInput {
  rolFirmante: string
  observaciones?: string | null
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}
