export interface RegistroValor {
  id: string
  registroId: string
  planillaCampoId: string
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

export const ESTADO_REGISTRO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completado",
  FIRMADO: "Firmado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
}

export interface RegistroDetalle {
  id: string
  elementoTareaId: string
  planillaId: string
  proyectoId: string
  terminalId: string
  estado: string
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
  puedeFirearUsuarioActual: boolean
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
  /** Imagen de la firma como dataURL Base64 (PNG). Se persiste en RegistroFirma.DatosFirma. */
  datosFirma?: string | null
  /**
   * Si es true y datosFirma viene vacío, el backend toma la firma guardada del perfil del
   * usuario (ApplicationUser.FirmaUrl) y la persiste como DatosFirma. Así evitamos el fetch
   * directo desde el browser al blob (CORS).
   */
  usarFirmaGuardada?: boolean
}

export interface RegistroVerificacionFirma {
  rol: string
  nombreFirmante: string
  fechaFirma: string
}

export interface RegistroVerificacion {
  registroId: string
  estado: string
  planillaCodigo?: string
  planillaNombre?: string
  planillaVersion?: string
  proyectoNombre?: string
  elementoNombre?: string
  tareaNombre?: string
  fechaTerminado?: string
  fechaFirma?: string
  pdfHashSha256?: string | null
  pdfGeneradoEn?: string | null
  pdfDisponible: boolean
  firmas: RegistroVerificacionFirma[]
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}
