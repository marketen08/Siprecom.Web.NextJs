import { create } from "zustand"

interface OpenAreaState {
  id: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useOpenArea = create<OpenAreaState>((set) => ({
  id: null,
  isOpen: false,
  open: (id) => set({ id, isOpen: true }),
  close: () => set({ id: null, isOpen: false }),
}))
