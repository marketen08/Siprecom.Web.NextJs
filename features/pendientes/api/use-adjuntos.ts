import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { PendienteAdjunto } from "../types"

export function useGetAdjuntos(pendienteId: string | null) {
  return useQuery({
    queryKey: ["pendientes", pendienteId, "adjuntos"],
    queryFn: () =>
      apiClient.get<ApiResponse<PendienteAdjunto[]>>(
        `/api/pendientes/${pendienteId}/adjuntos`,
      ),
    enabled: !!pendienteId,
  })
}

interface SubirInput {
  pendienteId: string
  file: File
}

export function useSubirAdjunto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ pendienteId, file }: SubirInput) => {
      const fd = new FormData()
      fd.append("archivo", file)
      const res = await fetch(`/api/pendientes/${pendienteId}/adjuntos`, {
        method: "POST",
        body: fd,
      })
      const ct = res.headers.get("content-type") ?? ""
      if (!ct.includes("application/json")) {
        const text = await res.text()
        throw new Error(`Respuesta no-JSON (${res.status}): ${text.slice(0, 200)}`)
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`)
      return json
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pendientes", vars.pendienteId] })
      qc.invalidateQueries({ queryKey: ["pendientes", vars.pendienteId, "adjuntos"] })
    },
  })
}

export function useEliminarAdjunto(pendienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adjuntoId: string) =>
      apiClient.delete(`/api/pendientes/adjuntos/${adjuntoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendientes", pendienteId] })
      qc.invalidateQueries({ queryKey: ["pendientes", pendienteId, "adjuntos"] })
    },
  })
}
