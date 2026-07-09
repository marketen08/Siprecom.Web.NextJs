/**
 * Acciones del workflow de Pendiente que se pueden autorizar por grupo.
 * Espeja el enum backend `AccionPendiente`. Los valores derivados
 * (Rechazar/Cancelar/AsignarResponsable) chequean el mismo permiso que Aprobar
 * — no aparecen en el enum, se resuelven en el service.
 */
export enum AccionPendiente {
  Crear = 1,
  Iniciar = 2,
  EnviarAprobacion = 3,
  Aprobar = 4,
}

export const ACCIONES_LIST: { value: AccionPendiente; label: string; descripcion: string }[] = [
  { value: AccionPendiente.Crear, label: "Crear", descripcion: "Reportar un pendiente nuevo." },
  { value: AccionPendiente.Iniciar, label: "Iniciar", descripcion: "Tomar el pendiente y ponerlo en proceso." },
  { value: AccionPendiente.EnviarAprobacion, label: "Enviar a aprobación", descripcion: "Solicitar aprobación del cierre." },
  {
    value: AccionPendiente.Aprobar,
    label: "Aprobar / Rechazar / Cancelar / Asignar",
    descripcion: "Aprobar el cierre, rechazarlo con motivo, cancelar el pendiente, reasignar responsable.",
  },
]

export interface PendienteAccionGrupo {
  id: string
  accion: AccionPendiente
  grupoId: string
  grupoNombre: string
}

export interface PendienteAccionAsignacion {
  accion: AccionPendiente
  grupoIds: string[]
}

export interface PendienteAutorizacionSet {
  asignaciones: PendienteAccionAsignacion[]
}
