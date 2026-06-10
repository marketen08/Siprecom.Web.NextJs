import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ApsCodificacion } from "../types"

/**
 * Analiza un NWD traducido y trae las codificaciones de TAG (formas de Item.Name)
 * para que el usuario arme su lista de property names. Lazy: solo corre cuando
 * `enabled` (ej. al abrir el diálogo) — el backend re-descarga properties de APS
 * y puede tardar para modelos grandes.
 */
export function useGetApsCodificaciones(archivoId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["aps", "codificaciones", archivoId],
    queryFn: () =>
      apiClient.get<ApiResponse<ApsCodificacion[]>>(`/api/aps/codificaciones/${archivoId}`),
    enabled: enabled && !!archivoId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

/** Setea el CSV de property names (apsTagProperties) del proyecto. */
export async function setApsTagProperties(proyectoId: string, apsTagProperties: string): Promise<void> {
  await apiClient.patch<ApiResponse<boolean>>(
    `/api/proyectos/${proyectoId}/aps-tag-properties`,
    { apsTagProperties },
  )
}
