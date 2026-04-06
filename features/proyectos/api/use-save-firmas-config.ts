import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { FirmaConfigItem } from "../types"

export function useSaveFirmasConfig(proyectoId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (firmas: FirmaConfigItem[]) =>
      apiClient.post(`/api/proyectos/${proyectoId}/firmas-config`, firmas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proyectos", proyectoId, "firmas-config"] })
    },
  })
}
