import { create } from "zustand"

interface NewModuloState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewModulo = create<NewModuloState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
