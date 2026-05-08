import { create } from "zustand"

interface OpenCampoState {
  id: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useOpenCampo = create<OpenCampoState>((set) => ({
  id: null,
  isOpen: false,
  open: (id) => set({ id, isOpen: true }),
  close: () => set({ id: null, isOpen: false }),
}))
