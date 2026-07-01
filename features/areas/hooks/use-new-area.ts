import { create } from "zustand"

interface NewAreaState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewArea = create<NewAreaState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
