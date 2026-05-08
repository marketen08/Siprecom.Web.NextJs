import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Campo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
}

export function useGetCampos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre } = params

  return useQuery({
    queryKey: ["campos", { page, pageSize, nombre }],
    queryFn: () =>
      apiClient.get<PagedResponse<Campo>>("/api/campos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
      }),
  })
}
