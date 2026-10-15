import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useDeleteTestGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/testgroups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testgroups"] })
    },
  })
}
