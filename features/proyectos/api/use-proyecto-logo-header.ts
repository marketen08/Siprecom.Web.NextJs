import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

interface UploadResult {
  urlLogoHeader: string
  sasUrl: string
}

/**
 * Sube el logo combinado del proyecto. Cuando está seteado, el PDF de planillas
 * muestra solo esa imagen (reemplaza cliente+contratista). Invalida `proyectos`
 * para que el detalle vuelva a leer con la nueva URL.
 */
export function useUploadProyectoLogoHeader(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File): Promise<UploadResult> => {
      const fd = new FormData()
      fd.append("archivo", archivo, archivo.name)
      const res = await fetch(`/api/proyectos/${proyectoId}/logo-header`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? "No se pudo subir el logo.")
      }
      const json = await res.json()
      return json?.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      qc.invalidateQueries({ queryKey: ["proyecto-logo-header", proyectoId] })
    },
  })
}

/** Elimina el logo combinado del proyecto → PDF cae al fallback default. */
export function useDeleteProyectoLogoHeader(proyectoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`/api/proyectos/${proyectoId}/logo-header`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? "No se pudo eliminar el logo.")
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      qc.invalidateQueries({ queryKey: ["proyecto-logo-header", proyectoId] })
    },
  })
}

/**
 * Devuelve una SAS URL para mostrar el logo del proyecto en la UI. El backend
 * la genera con expiración de 60min; con react-query cacheamos 5min y refetch
 * al invalidar (después de upload/delete).
 */
export function useProyectoLogoHeaderSas(proyectoId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["proyecto-logo-header", proyectoId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const res = await fetch(`/api/proyectos/${proyectoId}/logo-header/sas`)
      if (!res.ok) return null
      const json = await res.json().catch(() => ({}))
      return json?.data?.sasUrl ?? null
    },
  })
}
