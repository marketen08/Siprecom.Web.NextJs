import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { AreaCreateInput } from "../types"

export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AreaCreateInput) => apiClient.post("/api/areas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] })
    },
  })
}
