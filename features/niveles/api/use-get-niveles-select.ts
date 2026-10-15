import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface NivelSelectItem { id: string; nombre: string; posicion: number; color: string | null }
interface NivelesResponse { data: NivelSelectItem[] }

/**
 * Normaliza la respuesta a `{ data: NivelSelectItem[] }`.
 * El backend devuelve el array PLANO (no envuelto en `{data}`) — algunos
 * consumidores esperan envelope. Este helper unifica.
 */
function normalizarRespuesta(raw: unknown): NivelesResponse {
  if (Array.isArray(raw)) return { data: raw as NivelSelectItem[] }
  const wrapped = raw as { data?: NivelSelectItem[] } | null
  return { data: wrapped?.data ?? [] }
}

export function useGetNivelesSelect() {
  return useQuery<NivelesResponse>({
    queryKey: ["niveles", "select"],
    queryFn: async () => normalizarRespuesta(await apiClient.get("/api/niveles")),
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
  return useQuery<NivelesResponse>({
    queryKey: ["niveles", "usados-en-proyecto"],
    queryFn: async () => normalizarRespuesta(await apiClient.get("/api/niveles/usados")),
  })
}
