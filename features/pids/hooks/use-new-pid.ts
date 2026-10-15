import { create } from "zustand"

interface NewPidState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useNewPid = create<NewPidState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))
