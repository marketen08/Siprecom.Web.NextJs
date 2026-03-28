import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse } from "@/features/proyectos/types"

interface ClienteOption {
  id: string
  nombre: string
  esContratista: boolean
}

export function useGetClientesSelect() {
  return useQuery({
    queryKey: ["clientes", "select"],
    queryFn: () =>
      apiClient.get<PagedResponse<ClienteOption>>("/api/clientes"),
    select: (res) => ({
      clientes: res.data.filter((c) => !c.esContratista),
      contratistas: res.data.filter((c) => c.esContratista),
    }),
    staleTime: 1000 * 60 * 10, // 10 min — los clientes no cambian seguido
  })
}
