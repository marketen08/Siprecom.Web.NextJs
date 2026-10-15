import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TestGroupCreateInput } from "../types"

export function useCreateTestGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TestGroupCreateInput) => apiClient.post("/api/testgroups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}
