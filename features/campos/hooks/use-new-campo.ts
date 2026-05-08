import { create } from "zustand"

interface NewCampoState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewCampo = create<NewCampoState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
