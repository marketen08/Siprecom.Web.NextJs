import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Planilla } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

interface Params {
  page?: number
  pageSize?: number
  nombre?: string
  /**
   * Filtro multi-select por colecciones de planillas (PlanillaGrupo en el backend). Backend semantics: incluye
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
  /** true = sólo las que no usa ninguna tarea; false = sólo las que sí; undefined = todas. */
  sinUso?: boolean
  /**
   * true = sólo las que usa alguna tarea del proyecto activo del usuario.
   *
   * El proyecto NO se manda: lo resuelve el backend desde el usuario. Y cuando está
   * activo, el conteo de la columna "Uso" también viene acotado a ese proyecto, para
   * que el número coincida con el recorte de la lista.
   */
  usadaEnProyectoActivo?: boolean
}

export function useGetPlanillas(params: Params = {}) {
  const {
    page = 1, pageSize = 10, nombre, planillaGrupoIds, esEncabezadoTG, equipoId,
    sinUso, usadaEnProyectoActivo,
  } = params

  // Serializamos como CSV para matchear el binding del PagedRequest en backend.
  const planillaGrupoIdsCsv =
    planillaGrupoIds && planillaGrupoIds.length > 0 ? planillaGrupoIds.join(",") : undefined

  return useQuery({
    queryKey: ["planillas", {
      page, pageSize, nombre, planillaGrupoIdsCsv, esEncabezadoTG, equipoId,
      sinUso, usadaEnProyectoActivo,
    }],
    queryFn: () =>
      apiClient.get<PagedResponse<Planilla>>("/api/planillas", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(planillaGrupoIdsCsv ? { planillaGrupoIds: planillaGrupoIdsCsv } : {}),
        ...(esEncabezadoTG !== undefined ? { esEncabezadoTG: String(esEncabezadoTG) } : {}),
        ...(equipoId ? { equipoId } : {}),
        ...(sinUso !== undefined ? { sinUso: String(sinUso) } : {}),
        ...(usadaEnProyectoActivo ? { usadaEnProyectoActivo: "true" } : {}),
      }),
  })
}
