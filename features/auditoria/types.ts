export interface AuditoriaCambio {
  campo: string
  anterior: string | null
  nuevo: string | null
}

export interface AuditoriaRow {
  id: string
  fecha: string
  usuarioId: string | null
  usuarioNombre: string | null
  usuarioEmail: string | null
  ipAddress: string | null
  entidad: string
  entidadId: string
  /** Identificador humano (ej "V-100 · Válvula de bola"). Null si no pudo resolver. */
  entidadResumen: string | null
  accion: string
  cambios: AuditoriaCambio[]
}

export interface AuditoriaPaged {
  total: number
  page: number
  pageSize: number
  items: AuditoriaRow[]
}

export interface AuditoriaFiltros {
  desde?: string
  hasta?: string
  usuarioId?: string
  entidades?: string[]
  acciones?: string[]
  search?: string
}

/**
 * Mapeo de nombres técnicos → labels humanos. Cubre las entidades más consultadas.
 * Si aparece una entidad que no está acá, se muestra el nombre técnico tal cual.
 */
export const ENTIDAD_LABEL: Record<string, string> = {
  Elemento: "Elemento",
  Sistema: "Sistema",
  SubSistema: "Subsistema",
  Tarea: "Tarea (catálogo)",
  ElementoTarea: "Tarea del elemento",
  Registro: "Registro",
  RegistroValor: "Valor de registro",
  RegistroFirma: "Firma de registro",
  RegistroArchivo: "Archivo de registro",
  Pendiente: "Pendiente",
  Area: "Área",
  Modulo: "Módulo",
  TestGroup: "Paquete de prueba",
  TestGroupTarea: "Tarea de paquete",
  TestGroupElemento: "Elemento en paquete",
  SubsistemaCertificado: "Certificado RFC/RFSU/AOC",
  SubSistemaNivel: "Ventana de subsistema (nivel)",
  Planilla: "Planilla",
  PlanillaCampo: "Campo de planilla",
  PlanillaSeccion: "Sección de planilla",
  Nivel: "Nivel",
  Especialidad: "Especialidad",
  ElementoTipo: "Tipo de elemento",
  Procedimiento: "Procedimiento",
  ProyectoFirmaConfig: "Config firmas del proyecto",
  ProyectoFuncionalidad: "Funcionalidad del proyecto",
  ProyectoUsuarioRol: "Rol de usuario en proyecto",
  ApplicationUser: "Usuario",
  Cliente: "Cliente",
  Sociedad: "Sociedad",
  Proyecto: "Proyecto",
  Terminal: "Terminal",
  Campo: "Campo",
  PendienteCategoria: "Categoría de pendientes",
  PendienteTipo: "Tipo de pendiente",
  PendienteEstado: "Estado de pendiente",
  ElementoArea: "Vínculo elemento ↔ área",
  ProyectoIfcArchivo: "Maqueta 3D",
}

/** Grupos lógicos para el filtro rápido. Cada valor es una lista de nombres técnicos. */
export const ENTIDAD_GRUPOS: Array<{ key: string; label: string; entidades: string[] }> = [
  {
    key: "elementos",
    label: "Elementos y estructura",
    entidades: ["Elemento", "Sistema", "SubSistema", "SubSistemaNivel", "Area", "Modulo"],
  },
  {
    key: "tareas",
    label: "Tareas y ejecución",
    entidades: ["Tarea", "ElementoTarea", "Registro", "RegistroValor", "RegistroArchivo"],
  },
  {
    key: "firmas",
    label: "Firmas y certificados",
    entidades: ["RegistroFirma", "SubsistemaCertificado", "ProyectoFirmaConfig"],
  },
  {
    key: "packs",
    label: "Paquetes de prueba",
    entidades: ["TestGroup", "TestGroupTarea", "TestGroupElemento"],
  },
  {
    key: "catalogos",
    label: "Catálogos globales",
    entidades: ["Nivel", "Especialidad", "ElementoTipo", "Procedimiento"],
  },
  {
    key: "planillas",
    label: "Planillas y formularios",
    entidades: ["Planilla", "PlanillaCampo", "PlanillaSeccion"],
  },
]

export const ACCIONES = ["Creado", "Modificado", "Eliminado"] as const
export type Accion = (typeof ACCIONES)[number]

export const ACCION_BADGE: Record<string, string> = {
  Creado: "bg-green-100 text-green-800",
  Modificado: "bg-blue-100 text-blue-800",
  Eliminado: "bg-red-100 text-red-700",
}

/**
 * Etiquetas humanas para campos comunes. Cae en "camelCase → Title Case" si no está mapeado.
 * Se sabotea sobrecargar esto por entidad — usamos un pool común para no repetir.
 */
const CAMPO_LABEL: Record<string, string> = {
  Nombre: "Nombre",
  Codigo: "Código",
  Tag: "TAG",
  Descripcion: "Descripción",
  Estado: "Estado",
  Prioridad: "Prioridad",
  FechaInicio: "Fecha inicio",
  FechaFin: "Fecha fin",
  FechaPlanificada: "Fecha planificada",
  FechaFinalizacion: "Fecha finalización",
  IsActive: "Activo",
  SistemaId: "Sistema",
  SubSistemaId: "Subsistema",
  ElementoId: "Elemento",
  ElementoTipoId: "Tipo de elemento",
  EspecialidadId: "Especialidad",
  NivelId: "Nivel",
  AreaId: "Área",
  ModuloId: "Módulo",
  TareaId: "Tarea",
  PlanillaId: "Planilla",
  ProcedimientoId: "Procedimiento",
  Pid: "PID",
  Testpack: "Testpack",
  Observaciones: "Observaciones",
  MotivoRechazo: "Motivo de rechazo",
}

export function labelCampo(campo: string): string {
  if (CAMPO_LABEL[campo]) return CAMPO_LABEL[campo]
  // camelCase → separado + Title Case.
  return campo.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim()
}

export function labelEntidad(entidad: string): string {
  return ENTIDAD_LABEL[entidad] ?? entidad
}
