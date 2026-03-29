import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse, Proyecto } from "../types"

export function useGetProyectosSelect() {
  return useQuery({
    queryKey: ["proyectos-select"],
    queryFn: () =>
      apiClient.get<PagedResponse<Proyecto>>("/api/proyectos", { pageSize: 1000 }),
  })
}
