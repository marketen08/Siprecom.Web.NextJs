import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { refrescarPorCambioDeProyecto } from "@/lib/refrescar-por-cambio-de-proyecto"

export function useCambiarProyectoActivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.patch("/api/auth/me/proyecto-activo", { proyectoId }),
    // Refetch de lo que está en pantalla + baja de lo que no: ver el por qué en
    // refrescar-por-cambio-de-proyecto.
    onSuccess: () => refrescarPorCambioDeProyecto(queryClient),
  })
}
