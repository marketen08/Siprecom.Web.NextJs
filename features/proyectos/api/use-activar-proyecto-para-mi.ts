import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Response {
  message: string
  /** true si además de activarlo hubo que darle el acceso al usuario. */
  accesoCreado: boolean
}

/**
 * Activa un proyecto para el usuario actual, creando el acceso si le falta.
 *
 * Se diferencia de `useCambiarProyectoActivo` (PATCH me/proyecto-activo), que exige
 * que el usuario ya tenga el proyecto asignado en RecursosProyectos. Este sirve para
 * entrar a un proyecto que administra pero al que nunca lo asignaron — el caso que lo
 * motivó son los proyectos importados de la versión anterior, sobre todo los
 * finalizados, que llegan sin recursos asignados.
 */
export function useActivarProyectoParaMi() {
  const queryClient = useQueryClient()

  return useMutation<Response, Error, string>({
    mutationFn: (proyectoId: string) =>
      apiClient.post<Response>("/api/auth/me/activar-proyecto", { proyectoId }),
    onSuccess: () => {
      // Cambia el proyecto activo, así que casi todo lo que está en pantalla queda
      // viejo: mismo refetch amplio que usa el switcher de /ejecucion/proyectos.
      queryClient.refetchQueries({ type: "active" })
    },
  })
}
