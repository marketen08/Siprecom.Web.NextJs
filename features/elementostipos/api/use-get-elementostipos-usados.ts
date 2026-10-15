import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTipo } from "../types"
import type { PagedResponse } from "@/features/proyectos/types"

/**
 * Solo los Tipos de Elemento que el proyecto activo del user realmente usa
 * (tiene al menos un Elemento activo apuntando al tipo). Para selects
 * "en contexto" donde ofrecer un tipo sin elementos daría 0 al filtrar.
 * El backend resuelve el ProyectoId del user logueado.
 */
export function useGetElementosTiposUsados() {
  return useQuery({
    queryKey: ["elementostipos", "usados-en-proyecto"],
    queryFn: () => apiClient.get<PagedResponse<ElementoTipo>>("/api/elementostipos/usados"),
    staleTime: 1000 * 60 * 5,
  })
}
