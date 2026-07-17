import { create } from "zustand"

interface NewTestGroupState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewTestGroup = create<NewTestGroupState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
