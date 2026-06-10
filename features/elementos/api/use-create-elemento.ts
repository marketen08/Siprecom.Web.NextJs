import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoCreateInput } from "../types"

export function useCreateElemento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ElementoCreateInput) =>
      apiClient.post("/api/elementos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elementos"] })
      // El backend auto-vincula entidades del modelo 3D por TAG al crear, así que
      // refrescamos las queries del visor (entidades + colores por estado) para
      // que el vínculo nuevo se vea sin recargar la maqueta.
      queryClient.invalidateQueries({ queryKey: ["ifc"] })
    },
  })
}
