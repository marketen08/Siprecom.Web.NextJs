import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Planilla } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /**
   * Filtro multi-select por grupos de planillas. Backend semantics: incluye
   * planillas que están en al menos uno de los grupos listados. El token
   * especial "__none__" incluye planillas sin grupo (comodín).
   */
  planillaGrupoIds?: string[]
  /** true = sólo encabezado TG; false = sólo NO encabezado; undefined = todas. */
  esEncabezadoTG?: boolean
}

export function useGetPlanillas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, planillaGrupoIds, esEncabezadoTG } = params

  // Serializamos como CSV para matchear el binding del PagedRequest en backend.
  const planillaGrupoIdsCsv =
    planillaGrupoIds && planillaGrupoIds.length > 0 ? planillaGrupoIds.join(",") : undefined

  return useQuery({
    queryKey: ["planillas", { page, pageSize, nombre, planillaGrupoIdsCsv, esEncabezadoTG }],
    queryFn: () =>
      apiClient.get<PagedResponse<Planilla>>("/api/planillas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(planillaGrupoIdsCsv ? { planillaGrupoIds: planillaGrupoIdsCsv } : {}),
        ...(esEncabezadoTG !== undefined ? { esEncabezadoTG: String(esEncabezadoTG) } : {}),
      }),
  })
}
