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
  APROBADO: "Firmado físico",
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
  /**
   * Valores precargados a nivel Elemento+Planilla. El backend solo los envía
   * cuando `valores` está vacío (registro nunca completado). El form los aplica
   * como default editable.
   */
  valoresPrecargados?: RegistroValorPrecargado[]
}

export interface RegistroValorPrecargado {
  planillaCampoId: string
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
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

/**
 * Resultado de verificar la integridad criptográfica de un registro firmado.
 * Distinto de RegistroVerificacion (que es info pública). Acá el backend
 * recalcula el hash de cada firma y lo compara con el persistido — detecta
 * tampering de los valores del registro post-firma.
 */
export interface FirmaIntegridad {
  firmaId: string
  nombreFirmante: string
  rolFirmante: string
  fechaFirma: string
  integro: boolean
  hashPersistido: string
  hashRecalculado: string
}

export interface IntegridadRegistro {
  integro: boolean
  registroId: string
  firmasVerificadas: number
  firmas: FirmaIntegridad[]
}

export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}
