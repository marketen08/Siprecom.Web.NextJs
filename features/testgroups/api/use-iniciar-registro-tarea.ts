import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { EstadoRegistro } from "./use-get-tareas-pack"

export interface TestGroupTareaRegistroDTO {
  registroId: string
  planillaId: string
  registroEstado: EstadoRegistro
  reanudado: boolean
}

interface Payload {
  testGroupId: string
  tareaId: string
}

export function useIniciarRegistroTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ testGroupId, tareaId }: Payload) =>
      apiClient.post<ApiResponse<TestGroupTareaRegistroDTO>>(
        `/api/testgroups/${testGroupId}/tareas/${tareaId}/registro/iniciar`,
        {},
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId, "tareas"] })
      qc.invalidateQueries({ queryKey: ["testgroups", variables.testGroupId] })
    },
  })
}
