import { create } from "zustand"

interface NewProcedimientoState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewProcedimiento = create<NewProcedimientoState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
