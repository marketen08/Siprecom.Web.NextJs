import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { AvanceElementoDTO } from "../types"

interface Filters {
  sistemaId?: string
  subSistemaId?: string
}

/**
 * Lista de avance por elemento del proyecto del usuario, con filtros opcionales.
 * Si ambos filtros vienen vacíos, devuelve todos los elementos del proyecto.
 */
export function useGetAvanceElementos({ sistemaId, subSistemaId }: Filters) {
  return useQuery({
    queryKey: ["avance", "elementos", { sistemaId: sistemaId ?? "", subSistemaId: subSistemaId ?? "" }],
    queryFn: () =>
      apiClient.get<ApiResponse<AvanceElementoDTO[]>>("/api/avance/elementos", {
        ...(sistemaId ? { sistemaId } : {}),
        ...(subSistemaId ? { subSistemaId } : {}),
      }),
  })
}
