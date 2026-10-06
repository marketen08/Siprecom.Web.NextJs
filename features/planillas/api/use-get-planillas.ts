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
  /**
   * Equipo de administración dueño. "__none__" trae las globales. Sin esto, el backend ya
   * acota al equipo activo del usuario: este filtro es para elegir otro (AdminGlobal ve
   * todos, y un Admin con dos equipos puede mirar el que no tiene activo).
   */
  equipoId?: string
}

export function useGetPlanillas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, planillaGrupoIds, esEncabezadoTG, equipoId } = params

  // Serializamos como CSV para matchear el binding del PagedRequest en backend.
  const planillaGrupoIdsCsv =
    planillaGrupoIds && planillaGrupoIds.length > 0 ? planillaGrupoIds.join(",") : undefined

  return useQuery({
    queryKey: ["planillas", { page, pageSize, nombre, planillaGrupoIdsCsv, esEncabezadoTG, equipoId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Planilla>>("/api/planillas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(planillaGrupoIdsCsv ? { planillaGrupoIds: planillaGrupoIdsCsv } : {}),
        ...(esEncabezadoTG !== undefined ? { esEncabezadoTG: String(esEncabezadoTG) } : {}),
        ...(equipoId ? { equipoId } : {}),
      }),
  })
}
