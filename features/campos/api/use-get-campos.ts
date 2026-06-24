import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Campo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /** Filtra por tipo de dato (CampoTipoDato). undefined = todos. */
  tipoDato?: number
}

export function useGetCampos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, tipoDato } = params

  return useQuery({
    queryKey: ["campos", { page, pageSize, nombre, tipoDato }],
    queryFn: () =>
      apiClient.get<PagedResponse<Campo>>("/api/campos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(tipoDato != null ? { tipoDato } : {}),
      }),
  })
}
