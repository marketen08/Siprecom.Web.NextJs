import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { Equipo, EquipoDetalle, EquipoInput, MisEquipos } from "../types"

const QK = ["equipos"] as const
const QK_MIOS = ["equipos", "mios"] as const

/**
 * Padrón de equipos. El endpoint es AdminGlobal-only, así que un Admin recibe 403.
 * `enabled` existe para no disparar un request que ya sabemos que va a fallar: el
 * consumidor que no tiene bypass lo pasa en false y usa su propio mensaje. Ojo con
 * confundir "lista vacía" con "no pude listar" — son cosas distintas.
 */
export function useGetEquipos(enabled = true) {
  return useQuery({
    queryKey: QK,
    queryFn: () => apiClient.get<ApiResponse<Equipo[]>>("/api/equipos"),
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

export function useGetEquipo(id: string | null) {
  return useQuery({
    queryKey: [...QK, id],
    queryFn: () => apiClient.get<ApiResponse<EquipoDetalle>>(`/api/equipos/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}

export function useCreateEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EquipoInput) => apiClient.post<ApiResponse<Equipo>>("/api/equipos", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useUpdateEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: EquipoInput & { id: string }) =>
      apiClient.put<ApiResponse<Equipo>>(`/api/equipos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useDeleteEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiResponse<Equipo>>(`/api/equipos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  })
}

export function useAgregarMiembrosEquipo(equipoId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (usuarioIds: string[]) =>
      apiClient.post<ApiResponse<EquipoDetalle>>(`/api/equipos/${equipoId}/miembros`, { usuarioIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      // El acceso nuevo puede haber quedado como equipo activo del usuario: el menú del
      // perfil y el listado de planillas dependen de eso.
      qc.invalidateQueries({ queryKey: QK_MIOS })
      qc.invalidateQueries({ queryKey: ["planillas"] })
      // Los usuarios también: su lista de equipos alimenta la columna "Equipo" del
      // listado y el aviso de "no pertenece a ningún equipo" de su ficha. Sin esto, el
      // aviso seguía ahí después de haberlo resuelto.
      qc.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}

export function useQuitarMiembroEquipo(equipoId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (usuarioId: string) =>
      apiClient.delete<ApiResponse<EquipoDetalle>>(`/api/equipos/${equipoId}/miembros/${usuarioId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      qc.invalidateQueries({ queryKey: QK_MIOS })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

/** Los equipos del propio usuario. Lo usa el menú del perfil. */
/**
 * @param enabled Pasar `false` cuando la estructura de equipos está desactivada en la
 *   plataforma: sin esto la pantalla pediría igual el listado y después lo ignoraría.
 */
export function useGetMisEquipos(enabled = true) {
  return useQuery({
    queryKey: QK_MIOS,
    queryFn: () => apiClient.get<MisEquipos>("/api/equipos/mios"),
    staleTime: 1000 * 60 * 5,
    enabled,
  })
}

export function useCambiarEquipoActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (equipoId: string | null) =>
      apiClient.put<ApiResponse<MisEquipos>>("/api/equipos/activo", { equipoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_MIOS })
      // Cambiar de equipo cambia el catálogo que se lista y dónde nace lo que se crea.
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}

/** Mueve una planilla a otro equipo, o a global (equipoId null). Solo AdminGlobal. */
export function useAsignarEquipoPlanilla() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planillaId, equipoId }: { planillaId: string; equipoId: string | null }) =>
      apiClient.put<ApiResponse<unknown>>(`/api/planillas/${planillaId}/equipo`, { equipoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] })
      qc.invalidateQueries({ queryKey: QK })
    },
  })
}

/** De qué equipo toma un proyecto su catálogo de planillas. Solo AdminGlobal. */
export function useAsignarEquipoProyecto(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (equipoId: string | null) =>
      apiClient.patch<ApiResponse<boolean>>(`/api/proyectos/${proyectoId}/equipo`, { equipoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
      qc.invalidateQueries({ queryKey: QK })
    },
  })
}
