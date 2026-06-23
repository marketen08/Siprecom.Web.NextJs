import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { TestpackGrupo } from "../types"

/**
 * Grupo de Testpack de una ElementoTarea (líder + hermanos con misma Tarea y Testpack
 * en el proyecto). Lo usa la pantalla de carga para el checkbox "aplicar a todo el testpack".
 */
export function useGetTestpackGrupo(elementoTareaId: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", elementoTareaId, "testpack-grupo"],
    queryFn: () =>
      apiClient.get<{ data: TestpackGrupo }>(
        `/api/elementos-tareas/${elementoTareaId}/testpack-grupo`
      ),
    enabled: !!elementoTareaId,
  })
}
