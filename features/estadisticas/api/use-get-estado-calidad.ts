import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { DistribucionItemDTO } from "../types"

export interface CalidadResumen {
  abiertos: number
  /** Abiertos cuya fecha de compromiso ya pasó. */
  vencidos: number
  /** Abiertos sin fecha de compromiso: informes anteriores a que fuera obligatoria. */
  sinCompromiso: number
  eficaciasVencidas: number
  cerradosUltimos30: number
  bloqueanCertificado: number
}

export interface CalidadEtapa {
  estadoId: string
  estado: string | null
  count: number
  vencidos: number
}

export interface CalidadTramo {
  key: string
  label: string
  count: number
  desdeDias: number
}

export interface CalidadArea {
  grupoId: string
  nombre: string
  abiertos: number
  vencidos: number
}

export interface CalidadSubSistema {
  subSistemaId: string
  nombre: string
  count: number
}

export interface EstadoCalidad {
  resumen: CalidadResumen
  embudo: CalidadEtapa[]
  antiguedad: CalidadTramo[]
  areas: CalidadArea[]
  certificacion: CalidadSubSistema[]
  porTipo: DistribucionItemDTO[]
  porSeveridad: DistribucionItemDTO[]
  porMotivo: DistribucionItemDTO[]
}

/**
 * El tablero entero en una request.
 *
 * Sin staleTime largo a propósito: alguien que viene de cerrar un informe espera
 * ver el número bajar. Es una sola consulta y la pantalla no se abre cada treinta
 * segundos, así que no hay nada que ahorrar cacheándola.
 */
export function useGetEstadoCalidad() {
  return useQuery({
    queryKey: ["estadisticas", "calidad", "estado"],
    staleTime: 0,
    queryFn: () =>
      apiClient.get<ApiResponse<EstadoCalidad>>("/api/estadisticas/calidad/estado"),
  })
}
