import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TestGroupUpdateInput } from "../types"

export function useUpdateTestGroup(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TestGroupUpdateInput) => apiClient.put(`/api/testgroups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}
