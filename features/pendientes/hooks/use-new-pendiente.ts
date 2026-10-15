import { create } from "zustand"

/**
 * Prefill opcional. Los primeros 3 salen de contextos tipo "estoy viendo un elemento";
 * los últimos 5 salen del visor de PID en tablet (tap sobre el plano).
 */
export interface NewPendientePrefill {
  elementoId?: string
  subSistemaId?: string
  especialidadId?: string
  pid?: string
  pidArchivoId?: string
  pidPagina?: number
  pidCoordX?: number
  pidCoordY?: number
}

interface NewPendienteStore {
  isOpen: boolean
  prefill: NewPendientePrefill | null
  open: (prefill?: NewPendientePrefill) => void
  close: () => void
}

export const useNewPendiente = create<NewPendienteStore>((set) => ({
  isOpen: false,
  prefill: null,
  open: (prefill) => set({ isOpen: true, prefill: prefill ?? null }),
  close: () => set({ isOpen: false, prefill: null }),
}))
