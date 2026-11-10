/**
 * Firma en lote de registros. Espejo de `Core/DTOs/Registro/FirmaMasivaDTOs.cs`.
 *
 * La función se prende por proyecto (flag FIRMA_MASIVA) y además cada rol de firma
 * tiene que tenerla habilitada en la configuración de firmas. Nada de eso se decide
 * acá: el front pregunta por `/contexto` y muestra lo que el backend le diga.
 */

export interface FirmaMasivaRol {
  rolNombre: string
  descripcion: string | null
  /** Pendientes de este rol sin ningún filtro. Es el número con el que se arranca. */
  pendientes: number
}

export interface FirmaMasivaContexto {
  habilitada: boolean
  /** Por qué no está disponible. Se muestra tal cual; null si está habilitada. */
  motivoNoDisponible: string | null
  roles: FirmaMasivaRol[]
  /** El proyecto renderiza garabato → el lote exige firma guardada en el perfil. */
  requiereFirmaGuardada: boolean
  tieneFirmaGuardada: boolean
  topeLote: number
}

export interface FirmaMasivaFiltro {
  proyectoId: string
  rolNombre: string
  subSistemaId?: string
  tareaId?: string
  especialidadId?: string
  planillaId?: string
  excluirPropios?: boolean
  /**
   * Acota el lote a registros de tareas asignadas al firmante. Es OTRA pregunta
   * que `excluirPropios`: acá importa de quién es la TAREA, allá quién CARGÓ el
   * registro. Se combinan.
   */
  soloMisTareas?: boolean
}

export interface FirmaMasivaRegistro {
  registroId: string
  elementoNombre: string
  elementoTag: string
  tareaId: string | null
  tareaNombre: string
  subSistemaId: string | null
  subSistemaNombre: string
  planillaId: string | null
  planillaNombre: string
  especialidadId: string | null
  especialidadNombre: string | null
  especialidadCodigo: string | null
  especialidadColor: string | null
  fechaTerminado: string | null
  esFisico: boolean
  cargadoPorNombre: string
  /** Lo cargó el que está por firmar. La columna que hace visible lo propio. */
  esPropio: boolean
}

export interface FirmaMasivaOpcion {
  id: string
  nombre: string
  cantidad: number
}

export interface FirmaMasivaOpciones {
  subSistemas: FirmaMasivaOpcion[]
  tareas: FirmaMasivaOpcion[]
  especialidades: FirmaMasivaOpcion[]
  planillas: FirmaMasivaOpcion[]
}

export interface FirmaMasivaPreview {
  /** Cuántos matchean el criterio. */
  cantidad: number
  /** Cuántos se firman realmente en esta tanda (acotado al tope). */
  aFirmar: number
  propios: number
  tope: number
  excedeTope: boolean
}

export interface FirmaMasivaFirmarInput {
  filtro: FirmaMasivaFiltro
  /** Vacío = firmar todo lo que matchea el filtro, hasta el tope. */
  registroIds?: string[]
  /** Los que abrió antes de firmar. Queda como rastro, no se exige. */
  registrosRevisados?: string[]
  observaciones?: string
}

export interface FirmaMasivaOmitido {
  registroId: string
  elementoTag: string
  motivo: string
}

export interface FirmaMasivaResultado {
  firmados: number
  omitidos: number
  omisiones: FirmaMasivaOmitido[]
}
