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
  /**
   * Estado efectivo (global AND proyecto) de TODAS las funcionalidades del
   * catálogo, por clave. Los booleanos sueltos de arriba quedan por los
   * consumidores que ya los usan, pero para gatear algo nuevo conviene este mapa:
   * no hay que tocar el backend por cada funcionalidad.
   */
  funcionalidades: Record<string, boolean>
}

export function useGetMisProyectos() {
  return useQuery({
    queryKey: ["mis-proyectos"],
    queryFn: () => apiClient.get<ProyectoOpcion[]>("/api/auth/mis-proyectos"),
    staleTime: 1000 * 60 * 5,
  })
}
