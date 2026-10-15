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
  /**
   * Filtra por equipo dueño. "__none__" = los globales. undefined = lo que el backend
   * decide por defecto: el equipo activo del usuario más los globales, o todo para
   * AdminGlobal.
   */
  equipoId?: string
}

export function useGetCampos(params: Params = {}) {
  const { page = 1, pageSize = 10, nombre, tipoDato, planillaId, equipoId } = params

  return useQuery({
    queryKey: ["campos", { page, pageSize, nombre, tipoDato, planillaId, equipoId }],
    queryFn: () =>
      apiClient.get<PagedResponse<Campo>>("/api/campos", {
        page,
        pageSize,
        ...(nombre ? { nombre } : {}),
        ...(tipoDato != null ? { tipoDato } : {}),
        ...(planillaId ? { planillaId } : {}),
        ...(equipoId ? { equipoId } : {}),
      }),
  })
}
