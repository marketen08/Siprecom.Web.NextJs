import { useMutation } from "@tanstack/react-query"

interface DownloadResponse {
  data: {
    url: string
    nombreArchivo: string | null
    urlExpiraEn: string
  }
  message?: string
}

/**
 * Obtiene una SAS URL temporal del PDF del procedimiento desde el backend y la abre
 * en una pestaña nueva. La autorización (Admin o rol asignado en algún proyecto que
 * use el procedimiento) la valida el backend.
 *
 * Usa mutation (no query) porque es una acción on-demand disparada por el usuario.
 */
export function useDownloadProcedimiento() {
  return useMutation({
    mutationFn: async (procedimientoId: string): Promise<DownloadResponse> => {
      const res = await fetch(`/api/procedimientos/${procedimientoId}/download`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "No se pudo descargar el procedimiento." }))
        throw new Error(err?.message ?? "No se pudo descargar el procedimiento.")
      }
      return res.json()
    },
    onSuccess: (json) => {
      const url = json?.data?.url
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer")
      }
    },
  })
}
