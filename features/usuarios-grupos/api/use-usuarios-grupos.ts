import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  UsuarioGrupo, UsuarioGrupoDetalle, UsuarioGrupoInput, UsoGrupoFiltro, QuitarMiembroImpacto,
  GrupoResponsableOpcion, GrupoAsignacionOpcion,
  ReexpansionPreview, ReexpansionResultado,
} from "../types"

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

/** Marca o desmarca a un miembro como responsable del grupo. */
export function useMarcarResponsable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ grupoId, usuarioId, esResponsable }: {
      grupoId: string
      usuarioId: string
      esResponsable: boolean
    }) =>
      apiClient.patch<ApiResponse<UsuarioGrupoDetalle>>(
        `/api/usuarios-grupos/${grupoId}/miembros/${usuarioId}/responsable`,
        { esResponsable },
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

/**
 * Impacto de quitar a alguien del grupo. Se consulta al abrir la confirmación, no al
 * cargar la lista: es una consulta por miembro y sólo interesa cuando alguien está por
 * sacarlo.
 */
export function useImpactoQuitarMiembro(grupoId: string | null, usuarioId: string | null) {
  return useQuery({
    queryKey: [...QK, grupoId, "impacto-quitar", usuarioId],
    queryFn: () =>
      apiClient.get<ApiResponse<QuitarMiembroImpacto>>(
        `/api/usuarios-grupos/${grupoId}/miembros/${usuarioId}/impacto-quitar`,
      ),
    enabled: !!grupoId && !!usuarioId,
    // Sin cache: entre que se abre el diálogo y se confirma, la configuración pudo
    // cambiar — y este dato existe justamente para que la decisión sea informada.
    staleTime: 0,
  })
}

/**
 * Grupos para elegir el responsable de un pendiente, con cuántos miembros ven el proyecto.
 *
 * Separado de useGetUsuariosGrupos("pendientes") porque aquel es de administración y
 * exige rol Admin: quien crea o reasigna pendientes es User o Supervisor, recibía 403 y
 * el select salía vacío.
 */
export function useGetGruposResponsables() {
  return useQuery({
    queryKey: [...QK, "responsables-pendiente"],
    queryFn: () =>
      apiClient.get<ApiResponse<GrupoResponsableOpcion[]>>("/api/usuarios-grupos/responsables-pendiente"),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Grupos con sus miembros, para filtrar la lista de usuarios al asignar tareas.
 *
 * Endpoint propio por lo mismo que el de pendientes: el listado de administración
 * exige Admin y quien coordina es Coordinador, así que ahí recibía 403 y el select
 * salía vacío diciendo que no había grupos.
 */
export function useGetGruposParaAsignar() {
  return useQuery({
    queryKey: [...QK, "para-asignar"],
    queryFn: () =>
      apiClient.get<ApiResponse<GrupoAsignacionOpcion[]>>("/api/usuarios-grupos/para-asignar"),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Qué cambiaría al poner al día las asignaciones que salieron de este grupo.
 *
 * Hace falta porque la expansión del grupo se GUARDA: mover la membresía ya no
 * reescribe quién está asignado —eso es lo que deja registro— y esta es la forma
 * explícita de ponerlo al día.
 *
 * Se pide al abrir el diálogo y sin cache: la acción saca gente de trabajo asignado,
 * así que la lista tiene que ser la de este momento, no una guardada.
 */
export function useReexpansionPreview(grupoId: string | null) {
  return useQuery({
    queryKey: [...QK, grupoId, "reexpansion-preview"],
    queryFn: () =>
      apiClient.get<ApiResponse<ReexpansionPreview>>(
        `/api/usuarios-grupos/${grupoId}/reexpansion/preview`,
      ),
    enabled: !!grupoId,
    staleTime: 0,
  })
}

export function useAplicarReexpansion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (grupoId: string) =>
      apiClient.post<ApiResponse<ReexpansionResultado>>(
        `/api/usuarios-grupos/${grupoId}/reexpansion`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK })
      // Toca asignaciones de tareas y pendientes, así que las dos bandejas quedan viejas.
      qc.invalidateQueries({ queryKey: ["elementos-tareas"] })
      qc.invalidateQueries({ queryKey: ["pendientes"] })
    },
  })
}
