import { create } from "zustand"

interface NewClienteState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewCliente = create<NewClienteState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
