import { create } from "zustand"

interface NewPlanillaState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewPlanilla = create<NewPlanillaState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
