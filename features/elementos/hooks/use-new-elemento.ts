import { create } from "zustand"

interface NewElementoState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewElemento = create<NewElementoState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
