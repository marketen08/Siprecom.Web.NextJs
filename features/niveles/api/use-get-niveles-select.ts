import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useGetNivelesSelect() {
  return useQuery({
    queryKey: ["niveles", "select"],
    queryFn: () => apiClient.get("/api/niveles"),
  })
}

/**
 * Solo los Niveles que el proyecto activo del user realmente atraviesa — los
 * que tienen al menos una ElementoTarea viva. Para selects "en contexto" como
 * el filtro del visor 3D, donde ofrecer un nivel sin tareas dejaría 0
 * elementos al seleccionarlo.
 *
 * El backend resuelve el ProyectoId del user logueado — el frontend no manda
 * nada.
 */
export function useGetNivelesUsadosSelect() {
  return useQuery({
    queryKey: ["niveles", "usados-en-proyecto"],
    queryFn: () => apiClient.get("/api/niveles/usados"),
  })
}
