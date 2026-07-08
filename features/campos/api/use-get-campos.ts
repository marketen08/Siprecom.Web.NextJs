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
  /** Filtra por Planilla: solo campos vinculados como PlanillaCampo activo. undefined = todas. */
  planillaId?: string
}

export function useGetCampos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, tipoDato, planillaId } = params

  return useQuery({
    queryKey: ["campos", { page, pageSize, nombre, tipoDato, planillaId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Campo>>("/api/campos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(tipoDato != null ? { tipoDato } : {}),
        ...(planillaId ? { planillaId } : {}),
      }),
  })
}
