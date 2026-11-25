/**
 * Tipos de la Fase 3 (cierre). Espejo de `Core/DTOs/Soldadura/SoldaduraCierreDTOs.cs`.
 */

export enum ReglaCierre {
  Trazabilidad = 0,
  Ensayos = 1,
  Procedimientos = 2,
  Calificaciones = 3,
  Matriz = 4,
  PersonalEnd = 5,
}

export const REGLA_CIERRE: Record<ReglaCierre, { label: string; detalle: string; adjunta: string; porLinea: boolean }> = {
  [ReglaCierre.Trazabilidad]: {
    label: "Trazabilidad de la línea",
    detalle: "Todas las juntas de las líneas del tag liberadas, con WPS, soldadores y las dos piezas con colada o certificado.",
    adjunta: "Trazabilidad (010-05), inspección visual (010-11) y control de parámetros (010-07) de cada línea.",
    porLinea: true,
  },
  [ReglaCierre.Ensayos]: {
    label: "Ensayos de la línea",
    detalle: "Todo con visual aprobada y en lote, sin lotes abiertos, ensayos pendientes ni juntas rechazadas sin reparar.",
    adjunta: "Liberación de cada lote (010-06) y los informes del laboratorio.",
    porLinea: true,
  },
  [ReglaCierre.Procedimientos]: {
    label: "Procedimientos (WPS / PQR)",
    detalle: "Los WPS de la matriz y de las juntas aprobados y con su PDF, cada uno con al menos un PQR con PDF.",
    adjunta: "Los PDF de los WPS y sus PQR.",
    porLinea: false,
  },
  [ReglaCierre.Calificaciones]: {
    label: "Calificaciones de soldadores",
    detalle: "Cada soldador habilitado con alguna calificación vigente, y las vigentes con su PDF.",
    adjunta: "Los PDF de las calificaciones vigentes.",
    porLinea: false,
  },
  [ReglaCierre.Matriz]: {
    label: "Matriz de soldadura",
    detalle: "La matriz con filas y sin WPS que no estén aprobados.",
    adjunta: "La matriz de soldadura en PDF.",
    porLinea: false,
  },
  [ReglaCierre.PersonalEnd]: {
    label: "Personal de END",
    detalle: "Personal de END cargado, con la certificación vigente y su certificado.",
    adjunta: "Los certificados del personal de END.",
    porLinea: false,
  },
}

export interface TareaCatalogo {
  id: string
  codigo: number
  nombre: string
  elementoTipo: string | null
  nivel: string | null
}

export interface TareaReglaWrite {
  tareaId: string
  regla: ReglaCierre
}

export interface TareaRegla extends TareaReglaWrite {
  id: string
  tareaCodigo: number
  tareaNombre: string
  elementoTipo: string | null
  nivel: string | null
  instancias: number
}

export enum RolParte {
  QcContratista = 0,
  QaCliente = 1,
  Inspeccion3ra = 2,
}

export const ROL_PARTE_LABEL: Record<RolParte, string> = {
  [RolParte.QcContratista]: "QC de la contratista",
  [RolParte.QaCliente]: "QA del cliente",
  [RolParte.Inspeccion3ra]: "Inspección de tercera parte",
}

export interface ParteWrite {
  nombre: string
  rol: RolParte
  rolFirma: string
}

export interface Parte extends ParteWrite {
  id: string
  intervenciones: number
}

export interface IntervencionWrite {
  tareaId: string
  parteId: string
  codigo: string
  obligatoria: boolean
  horasAvisoPrevio?: number | null
}

export interface Intervencion extends IntervencionWrite {
  id: string
  tareaCodigo: number
  tareaNombre: string
  parteNombre: string
  rolFirma: string
}

export interface CierreEstado {
  elementoTareaId: string
  elementoId: string
  elementoTag: string
  tareaNombre: string
  regla: ReglaCierre
  estadoTarea: string
  cerrada: boolean
  cumple: boolean
  motivo: string | null
}

export interface Agenda {
  elementoTareaId: string
  elementoTag: string
  tareaNombre: string
  estadoTarea: string
  fechaPlanificada: string | null
  parteId: string
  parteNombre: string
  codigo: string
  obligatoria: boolean
  horasAvisoPrevio: number | null
  avisarDesde: string | null
  convocar: boolean
  firmaPendiente: boolean
}

export const ESTADO_TAREA_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADO: "Completada (firmas pendientes)",
  APROBADO: "Aprobada",
  FIRMADO: "Firmada",
  RECHAZADO: "Rechazada",
  CANCELADO: "Cancelada",
}
