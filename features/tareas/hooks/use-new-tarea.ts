import { create } from "zustand"
import type { Tarea } from "../types"

interface NewTareaState {
  isOpen: boolean
  /** Si está presente, el sheet se abre en modo "clonar" pre-cargando estos datos. */
  cloneFrom: Partial<Tarea> | null
  open: () => void
  openClone: (tarea: Partial<Tarea>) => void
  close: () => void
}

export const useNewTarea = create<NewTareaState>((set) => ({
  isOpen: false,
  cloneFrom: null,
  open: () => set({ isOpen: true, cloneFrom: null }),
  openClone: (tarea) => set({ isOpen: true, cloneFrom: tarea }),
  close: () => set({ isOpen: false, cloneFrom: null }),
}))
