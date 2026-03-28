import { create } from "zustand"

interface NewElementoTipoState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewElementoTipo = create<NewElementoTipoState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
