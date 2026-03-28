import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ClienteCreateInput } from "../types"

export function useCreateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ClienteCreateInput) =>
      apiClient.post("/api/clientes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] })
    },
  })
}
