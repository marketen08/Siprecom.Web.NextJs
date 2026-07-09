import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { UsuarioGrupo, UsuarioGrupoDetalle, UsuarioGrupoInput, UsoGrupoFiltro } from "../types"

const QK = ["usuarios-grupos"] as const

/** Trae todos los grupos activos. Con `uso` restringe a los que declaran ese contexto. */
export function useGetUsuariosGrupos(uso?: UsoGrupoFiltro) {
  return useQuery({
    queryKey: uso ? [...QK, { uso }] : QK,
    queryFn: () =>
      apiClient.get<ApiResponse<UsuarioGrupo[]>>(
        `/api/usuarios-grupos${uso ? `?uso=${uso}` : ""}`,
      ),
    staleTime: 1000 * 60 * 5,
  })
}

export function useGetUsuarioGrupo(id: string | null) {
  return useQuery({
    queryKey: [...QK, id],
    queryFn: () => apiClient.get<ApiResponse<UsuarioGrupoDetalle>>(`/api/usuarios-grupos/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}

export function useCreateUsuarioGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UsuarioGrupoInput) =>
      apiClient.post<ApiResponse<UsuarioGrupo>>("/api/usuarios-grupos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateUsuarioGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UsuarioGrupoInput & { id: string }) =>
      apiClient.put<ApiResponse<UsuarioGrupo>>(`/api/usuarios-grupos/${id}`, { id, ...data }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.id] })
    },
  })
}

export function useDeleteUsuarioGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/usuarios-grupos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

/** Agrega uno o más usuarios al grupo (idempotente). Devuelve el detalle actualizado. */
export function useAgregarMiembros() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, usuarioIds }: { grupoId: string; usuarioIds: string[] }) =>
      apiClient.post<ApiResponse<UsuarioGrupoDetalle>>(
        `/api/usuarios-grupos/${grupoId}/miembros`,
        { usuarioIds },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.grupoId] })
    },
  })
}

/** Quita al usuario del grupo (idempotente). Devuelve el detalle actualizado. */
export function useQuitarMiembro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, usuarioId }: { grupoId: string; usuarioId: string }) =>
      apiClient.delete<ApiResponse<UsuarioGrupoDetalle>>(
        `/api/usuarios-grupos/${grupoId}/miembros/${usuarioId}`,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: [...QK, vars.grupoId] })
    },
  })
}
