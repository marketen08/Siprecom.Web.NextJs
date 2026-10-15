import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProyectoCreateInput } from "../types"

export function useCreateProyecto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProyectoCreateInput) =>
      apiClient.post("/api/proyectos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos"] })
      // El backend asigna el proyecto recién creado como asignación activa del
      // usuario. Invalidamos también "mis-proyectos" (la query del switcher del
      // navbar) para que el select refleje la nueva selección sin tener que
      // refrescar toda la página.
      queryClient.invalidateQueries({ queryKey: ["mis-proyectos"] })
    },
  })
}
