import { create } from "zustand"

interface NewProyectoState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewProyecto = create<NewProyectoState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
