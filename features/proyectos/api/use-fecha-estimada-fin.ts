import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface FechaEstimadaPorNivel {
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  fechaInicio: string | null
  fechaFin: string | null
  cantidadSubSistemas: number
}

export interface FechaEstimadaFin {
  fechaInicioEstimada: string | null
  fechaFinEstimada: string | null
  cantidadFilas: number
  porNivel: FechaEstimadaPorNivel[]
}

interface FechaEstimadaResponse {
  data: FechaEstimadaFin
}

export function useGetFechaEstimadaFin(proyectoId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["proyectos", proyectoId, "fecha-estimada-fin"],
    queryFn: () => apiClient.get<FechaEstimadaResponse>(`/api/proyectos/${proyectoId}/fecha-estimada-fin`),
    enabled: !!proyectoId && enabled,
  })
}
