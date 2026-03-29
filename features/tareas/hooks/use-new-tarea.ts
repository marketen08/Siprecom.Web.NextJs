import { create } from "zustand"

interface NewTareaState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewTarea = create<NewTareaState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
