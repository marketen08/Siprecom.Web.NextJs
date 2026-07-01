import { create } from "zustand"
import type { TipoTestGroup } from "../types"

interface NewTestGroupState {
  isOpen: boolean
  tipo: TipoTestGroup | null
  open: (tipo: TipoTestGroup) => void
  close: () => void
}

export const useNewTestGroup = create<NewTestGroupState>((set) => ({
  isOpen: false,
  tipo: null,
  open: (tipo) => set({ isOpen: true, tipo }),
  close: () => set({ isOpen: false, tipo: null }),
}))
