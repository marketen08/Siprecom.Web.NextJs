import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  ApsFolderItem,
  ApsHub,
  ApsImportarInput,
  ApsProject,
  ApsStatus,
  ApsVersion,
} from "../types"

const QK_STATUS = ["aps", "status"] as const

export function useApsStatus() {
  return useQuery({
    queryKey: QK_STATUS,
    queryFn: () => apiClient.get<ApiResponse<ApsStatus>>("/api/aps/status"),
    staleTime: 1000 * 30,
  })
}

export function useApsDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<ApiResponse<unknown>>("/api/aps/disconnect", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_STATUS }),
  })
}

export function useApsHubs(enabled: boolean) {
  return useQuery({
    queryKey: ["aps", "hubs"],
    enabled,
    queryFn: () => apiClient.get<ApiResponse<ApsHub[]>>("/api/aps/hubs"),
  })
}

export function useApsProjects(hubId: string | null) {
  return useQuery({
    queryKey: ["aps", "hubs", hubId, "projects"],
    enabled: !!hubId,
    queryFn: () => apiClient.get<ApiResponse<ApsProject[]>>(
      `/api/aps/hubs/${encodeURIComponent(hubId!)}/projects`,
    ),
  })
}

export function useApsFolderContents(projectId: string | null, folderId: string | null) {
  return useQuery({
    queryKey: ["aps", "projects", projectId, "folders", folderId],
    enabled: !!projectId && !!folderId,
    queryFn: () => apiClient.get<ApiResponse<ApsFolderItem[]>>(
      `/api/aps/projects/${encodeURIComponent(projectId!)}/folders/${encodeURIComponent(folderId!)}/contents`,
    ),
  })
}

export function useApsItemVersions(projectId: string | null, itemId: string | null) {
  return useQuery({
    queryKey: ["aps", "projects", projectId, "items", itemId, "versions"],
    enabled: !!projectId && !!itemId,
    queryFn: () => apiClient.get<ApiResponse<ApsVersion[]>>(
      `/api/aps/projects/${encodeURIComponent(projectId!)}/items/${encodeURIComponent(itemId!)}/versions`,
    ),
  })
}

export function useApsImportar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ApsImportarInput) =>
      apiClient.post<ApiResponse<string>>("/api/aps/importar", input),
    onSuccess: (_, vars) => {
      // El IFC quedó en estado Pendiente — la página del proyecto refrescará via polling.
      qc.invalidateQueries({ queryKey: ["proyectos", vars.proyectoId, "ifc"] })
    },
  })
}

/**
 * Redirige el browser al endpoint de login APS. NO se puede usar fetch porque
 * el endpoint responde con 302 a Autodesk y el browser tiene que seguirlo.
 * El backend cifra el `returnTo` en el state — cuando termina el flow,
 * Autodesk redirige al callback y éste hace 302 al `returnTo` original.
 */
export function startApsLogin(returnTo?: string) {
  const url = `/api/aps/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`
  window.location.href = url
}

export interface UploadNwdInput {
  proyectoId: string
  nombre: string
  disciplina?: string
  marcarComoPrincipal: boolean
  archivo: File
}

export function useUploadNwd(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UploadNwdInput) => {
      const fd = new FormData()
      fd.append("proyectoId", input.proyectoId)
      fd.append("nombre", input.nombre)
      if (input.disciplina) fd.append("disciplina", input.disciplina)
      fd.append("marcarComoPrincipal", String(input.marcarComoPrincipal))
      fd.append("archivo", input.archivo)
      const res = await fetch(`/api/aps/upload-nwd`, { method: "POST", body: fd })
      const body = await res.json().catch(() => ({ message: "Error al subir NWD" }))
      if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`)
      return body
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", proyectoId, "ifc"] })
    },
  })
}

/**
 * Trae el token para el Autodesk Viewer. Lo llama el viewer en runtime para
 * refrescar cuando está por vencer. Devuelve { token, expiresIn }.
 */
export async function fetchViewerToken(): Promise<{ token: string; expiresIn: number }> {
  const res = await apiClient.get<ApiResponse<{ token: string; expiresIn: number }>>(
    "/api/aps/viewer-token",
  )
  if (!res?.data?.token) throw new Error("No se pudo obtener el token del viewer.")
  return res.data
}
