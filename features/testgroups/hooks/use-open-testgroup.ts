import { create } from "zustand"

interface OpenTestGroupState {
  id: string | null
  isOpen: boolean
  open: (id: string) => void
  close: () => void
}

export const useOpenTestGroup = create<OpenTestGroupState>((set) => ({
  id: null,
  isOpen: false,
  open: (id) => set({ id, isOpen: true }),
  close: () => set({ id: null, isOpen: false }),
}))
