import { create } from "zustand"

interface NewPendienteStore {
  isOpen: boolean
  /** Prefill opcional cuando se crea desde el sheet de un elemento. */
  prefill: { elementoId?: string; subSistemaId?: string; especialidad?: string } | null
  open: (prefill?: { elementoId?: string; subSistemaId?: string; especialidad?: string }) => void
  close: () => void
}

export const useNewPendiente = create<NewPendienteStore>((set) => ({
  isOpen: false,
  prefill: null,
  open: (prefill) => set({ isOpen: true, prefill: prefill ?? null }),
  close: () => set({ isOpen: false, prefill: null }),
}))
