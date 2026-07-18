import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Planilla } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /**
   * Filtro multi-select por especialidades. Backend semantics: incluye planillas
   * cuyo `EspecialidadId` está en la lista, MÁS las genéricas (sin especialidad).
   */
  especialidadIds?: string[]
  /** true = sólo encabezado TG; false = sólo NO encabezado; undefined = todas. */
  esEncabezadoTG?: boolean
}

export function useGetPlanillas(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, especialidadIds, esEncabezadoTG } = params

  // Serializamos como CSV para matchear el binding del PagedRequest en backend.
  const especialidadIdsCsv =
    especialidadIds && especialidadIds.length > 0 ? especialidadIds.join(",") : undefined

  return useQuery({
    queryKey: ["planillas", { page, pageSize, nombre, especialidadIdsCsv, esEncabezadoTG }],
    queryFn: () =>
      apiClient.get<PagedResponse<Planilla>>("/api/planillas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(especialidadIdsCsv ? { especialidadIds: especialidadIdsCsv } : {}),
        ...(esEncabezadoTG !== undefined ? { esEncabezadoTG: String(esEncabezadoTG) } : {}),
      }),
  })
}
