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
    },
  })
}
