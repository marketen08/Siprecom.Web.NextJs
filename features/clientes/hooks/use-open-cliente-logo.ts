import { create } from "zustand"

/**
 * Sheet para cargar SOLO el logo de una empresa, separado del de edición.
 *
 * Existe porque los dos permisos son distintos: el Admin puede cargarle el logo a las
 * empresas que dio de alta él, pero no renombrarlas —el nombre sale en los reportes y
 * certificados de los proyectos de todos los equipos—. Reusar el sheet de edición con el
 * nombre deshabilitado mostraría un campo que no se puede tocar y un título que miente.
 */
interface OpenClienteLogoState {
  id: string | null
  isOpen: boolean
  abrirLogo: (id: string) => void
  cerrarLogo: () => void
}

export const useOpenClienteLogo = create<OpenClienteLogoState>((set) => ({
  id: null,
  isOpen: false,
  abrirLogo: (id) => set({ id, isOpen: true }),
  cerrarLogo: () => set({ id: null, isOpen: false }),
}))
