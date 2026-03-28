import { create } from "zustand"

interface OpenProyectoState {
  id: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useOpenProyecto = create<OpenProyectoState>((set) => ({
  id: null,
  isOpen: false,
  open: (id) => set({ id, isOpen: true }),
  close: () => set({ id: null, isOpen: false }),
}))
