/** Preset rápido de opciones para un campo Checklist. */
export type ChecklistPreset = {
  id: string
  label: string
  opciones: Array<{ valor: string; etiqueta: string }>
}

/**
 * Opciones prearmadas para campos Checklist. Usadas en:
 *  - Tab "Nuevo" del planilla builder (crear campo Checklist individual).
 *  - Tab "En lote" del planilla builder (opciones compartidas del bulk).
 *  - Editor de opciones del catálogo global (aplicar a un Checklist existente).
 *
 * Aplicar un preset REEMPLAZA las opciones actuales del campo — en el catálogo
 * eso implica confirmar con el user porque afecta a todas las planillas que lo
 * usan.
 */
export const CHECKLIST_PRESETS: ChecklistPreset[] = [
  {
    id: "si-no-na",
    label: "Sí / No / N/A",
    opciones: [
      { valor: "SI", etiqueta: "Sí" },
      { valor: "NO", etiqueta: "No" },
      { valor: "NA", etiqueta: "No Aplica" },
    ],
  },
  {
    id: "ok-nc-na",
    label: "OK / NC / NA",
    opciones: [
      { valor: "NA", etiqueta: "No Aplica" },
      { valor: "OK", etiqueta: "Chequeado & aceptado" },
      { valor: "NC", etiqueta: "Chequeado & no conforme" },
    ],
  },
]
