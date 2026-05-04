import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface NextCodigoResponse {
  data: { codigo: number }
}

/**
 * Devuelve el próximo código disponible para la terminal del usuario actual.
 * `enabled` permite suspender el fetch cuando no hace falta (ej. sheet cerrado).
 */
export function useGetNextTareaCodigo(enabled: boolean = true) {
  return useQuery({
    queryKey: ["tareas", "next-codigo"],
    queryFn: () => apiClient.get<NextCodigoResponse>("/api/tareas/next-codigo"),
    enabled,
    // El próximo código puede cambiar si otro admin crea una tarea — no cachear mucho.
    staleTime: 0,
    gcTime: 0,
  })
}
