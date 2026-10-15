import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { TestGroupTareaItem } from "./use-get-tareas-pack"

/**
 * Lista de tareas EXCLUIDAS del pack (soft-deleted). Sirve al panel de
 * config en Alcance para reincorporarlas. Devuelve el mismo shape que
 * useGetTareasPack — sólo las columnas mínimas para el panel están populadas.
 */
export function useGetTareasExcluidasPack(testGroupId: string | null) {
  return useQuery({
    queryKey: ["testgroups", testGroupId, "tareas-excluidas"],
    queryFn: () =>
      apiClient.get<ApiResponse<TestGroupTareaItem[]>>(
        `/api/testgroups/${testGroupId}/tareas/excluidas`,
      ),
    enabled: !!testGroupId,
  })
}
