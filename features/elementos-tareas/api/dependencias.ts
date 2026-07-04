import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface Dependencia {
  id: string
  predecesorId: string
  predecesorTag: string | null
  predecesorTareaNombre: string | null
  predecesorEstado: number
  predecesorEstadoTexto: string
  predecesorFechaPlanificada: string | null
  predecesorFechaFinalizacion: string | null
  sucesorId: string
  sucesorTag: string | null
  sucesorTareaNombre: string | null
  sucesorEstado: number
  sucesorEstadoTexto: string
  sucesorFechaPlanificada: string | null
  lagDias: number
  /** True si viene de Tarea.TareaPrecedenteId (materializada por el sync). False = override manual. */
  esCatalogal: boolean
  createdAt: string
}

export interface DependenciaResumen {
  elementoTareaId: string
  predecesores: Dependencia[]
  sucesores: Dependencia[]
}

export interface CreateDependenciaInput {
  predecesorId: string
  sucesorId: string
  lagDias: number
}

export interface UpdateDependenciaInput {
  id: string
  lagDias: number
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useGetDependencias(elementoTareaId: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", elementoTareaId, "dependencias"],
    queryFn: () =>
      apiClient.get<{ data: DependenciaResumen }>(
        `/api/elementos-tareas/${elementoTareaId}/dependencias`,
      ),
    enabled: !!elementoTareaId,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────
// Todas invalidan las queries de dependencias afectadas — tanto la del
// predecesor como la del sucesor, porque el "resumen" incluye las dos direcciones.

export function useCreateDependencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDependenciaInput) =>
      apiClient.post<{ data: Dependencia }>("/api/elementos-tareas/dependencias", input),
    onSuccess: (_res, input) => {
      qc.invalidateQueries({ queryKey: ["elementos-tareas", input.predecesorId, "dependencias"] })
      qc.invalidateQueries({ queryKey: ["elementos-tareas", input.sucesorId, "dependencias"] })
    },
  })
}

export function useUpdateDependencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateDependenciaInput) =>
      apiClient.put<{ data: Dependencia }>(
        `/api/elementos-tareas/dependencias/${input.id}`,
        { lagDias: input.lagDias },
      ),
    onSuccess: () => {
      // No sabemos los IDs sin el response, invalidamos todo el grupo.
      qc.invalidateQueries({ queryKey: ["elementos-tareas"], predicate: (q) => q.queryKey.includes("dependencias") })
    },
  })
}

export function useDeleteDependencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/elementos-tareas/dependencias/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elementos-tareas"], predicate: (q) => q.queryKey.includes("dependencias") })
    },
  })
}
