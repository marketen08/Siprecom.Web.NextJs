import { create } from "zustand"

interface OpenNivelState {
  id: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useOpenNivel = create<OpenNivelState>((set) => ({
  id: null,
  isOpen: false,
  open: (id) => set({ id, isOpen: true }),
  close: () => set({ id: null, isOpen: false }),
}))
