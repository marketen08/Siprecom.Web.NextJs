import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetTarea(id: string | null) {
  return useQuery({
    queryKey: ["tareas", id],
    queryFn: () => apiClient.get(`/api/tareas/${id}`),
    enabled: !!id,
  })
}
