import { create } from "zustand"

interface NewSistemaState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewSistema = create<NewSistemaState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
