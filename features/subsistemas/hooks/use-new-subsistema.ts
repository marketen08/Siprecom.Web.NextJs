import { create } from "zustand"

interface NewSubSistemaState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewSubSistema = create<NewSubSistemaState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
