/**
 * Acciones del workflow de No Conformidad que se pueden autorizar por grupo.
 * Espeja el enum backend `AccionNoConformidad`.
 *
 * Las acciones mapean 1:1 con las etapas del circuito, así que autorizar por
 * acción es lo mismo que decir "qué grupo firma en cada estado". La excepción es
 * RevisarCierre, que cubre las dos salidas de Revisión (aprobar y rechazar):
 * quien puede aprobar el cierre puede también devolverlo.
 */
export enum AccionNoConformidad {
  Crear = 1,
  Evaluar = 2,
  RegistrarAccionInmediata = 3,
  RegistrarInvestigacion = 4,
  RevisarCierre = 5,
  DefinirEficacia = 6,
  RegistrarResultadoEficacia = 7,
  Cancelar = 8,
}

export const NC_ACCIONES_LIST: {
  value: AccionNoConformidad
  label: string
  /** Estado desde el que se ejecuta, para que la matriz se lea como el circuito. */
  estado: string
  descripcion: string
}[] = [
  {
    value: AccionNoConformidad.Crear,
    label: "Crear",
    estado: "—",
    descripcion: "Dar de alta un informe. Nace en Evaluación.",
  },
  {
    value: AccionNoConformidad.Evaluar,
    label: "Evaluar",
    estado: "Evaluación",
    descripcion: "Aceptar el informe para que el área afectada empiece a trabajar.",
  },
  {
    value: AccionNoConformidad.RegistrarAccionInmediata,
    label: "Registrar acción inmediata",
    estado: "Nuevo",
    descripcion: "Documentar y firmar la contención aplicada de inmediato.",
  },
  {
    value: AccionNoConformidad.RegistrarInvestigacion,
    label: "Registrar investigación",
    estado: "Investigación",
    descripcion: "Cargar causa raíz, acción correctiva y plan de mejora, y firmar.",
  },
  {
    value: AccionNoConformidad.RevisarCierre,
    label: "Revisar el cierre",
    estado: "Revisión",
    descripcion:
      "Aprobar el cierre o rechazarlo con motivo (vuelve a Investigación). Las dos salidas comparten permiso.",
  },
  {
    value: AccionNoConformidad.DefinirEficacia,
    label: "Definir eficacia",
    estado: "Definición de eficacia",
    descripcion: "Establecer qué se va a medir y en qué fecha para probar que sirvió.",
  },
  {
    value: AccionNoConformidad.RegistrarResultadoEficacia,
    label: "Registrar resultado de eficacia",
    estado: "Espera de resultado",
    descripcion:
      "Cargar la medición y cerrar. Si no fue eficaz, se genera un informe encadenado.",
  },
  {
    value: AccionNoConformidad.Cancelar,
    label: "Cancelar",
    estado: "Cualquiera no terminal",
    descripcion: "Descartar el informe con motivo. Nunca se auto-autoriza por pertenencia.",
  },
]

export interface NoConformidadAccionGrupo {
  id: string
  accion: AccionNoConformidad
  grupoId: string
  grupoNombre: string
}

export interface NoConformidadAccionAsignacion {
  accion: AccionNoConformidad
  grupoIds: string[]
}

export interface NoConformidadAutorizacionSet {
  asignaciones: NoConformidadAccionAsignacion[]
}
