import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { ParadaConfig, ParadaConfigUpdate, ParadaDashboard } from "../types"

export function useGetParadaConfig(proyectoId: string | null | undefined) {
  return useQuery({
    queryKey: ["paro-planta", proyectoId, "config"],
    queryFn: () =>
      apiClient.get<ApiResponse<ParadaConfig>>(`/api/proyectos/${proyectoId}/parada-config`),
    enabled: Boolean(proyectoId),
  })
}

export function useSetParadaConfig(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ParadaConfigUpdate) =>
      apiClient.put<ApiResponse<ParadaConfig>>(`/api/proyectos/${proyectoId}/parada-config`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paro-planta", proyectoId] })
    },
  })
}

/**
 * KPIs y serie del dashboard.
 *
 * Se refresca solo: durante una parada el tablero se deja abierto en una pantalla
 * y nadie lo va a recargar a mano. Un minuto es suficiente — la serie es horaria,
 * así que refrescar más seguido no agrega información.
 */
export function useGetParadaDashboard(
  proyectoId: string | null | undefined,
  opciones?: { refrescarMs?: number },
) {
  return useQuery({
    queryKey: ["paro-planta", proyectoId, "dashboard"],
    queryFn: () =>
      apiClient.get<ApiResponse<ParadaDashboard>>(`/api/proyectos/${proyectoId}/parada-dashboard`),
    enabled: Boolean(proyectoId),
    refetchInterval: opciones?.refrescarMs ?? 60_000,
    refetchOnWindowFocus: true,
  })
}
