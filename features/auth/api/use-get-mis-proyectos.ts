import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ProyectoOpcion {
  id: string
  nombre: string
  estado: number
  esActivo: boolean
  permitirRegistroFisico: boolean
  permitirRegistroDigital: boolean
  registrosFisicosPreFirmados: boolean
  /** Maqueta 3D efectiva (global AND proyecto) para este proyecto. */
  maqueta3d: boolean
  /**
   * TestGroups multi-subsistema efectivo. Cuando es false (default), los TestGroups
   * quedan restringidos a un único subsistema — el del pack — según OPERCOM.
   */
  testGroupsMultiSubsistema: boolean
  /**
   * Generación manual de tareas efectiva. Cuando es true, los sync automáticos
   * (crear elemento, importar tareas, etc.) NO propagan ET — el user tiene que
   * materializarlas desde /alcance/tareas/generacion.
   */
  generacionTareasManual: boolean
}

export function useGetMisProyectos() {
  return useQuery({
    queryKey: ["mis-proyectos"],
    queryFn: () => apiClient.get<ProyectoOpcion[]>("/api/auth/mis-proyectos"),
    staleTime: 1000 * 60 * 5,
  })
}
