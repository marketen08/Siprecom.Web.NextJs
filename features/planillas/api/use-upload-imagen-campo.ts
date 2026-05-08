import { useMutation } from "@tanstack/react-query"

interface UploadResponse {
  data: { url: string }
}

/**
 * Sube una imagen al storage para usarla en un PlanillaCampo de tipo Imagen.
 * Devuelve la URL del blob.
 */
export function useUploadImagenCampo() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const fd = new FormData()
      fd.append("archivo", file)

      const res = await fetch("/api/planillas/campos/imagen", {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? "Error al subir la imagen")
      }

      const json: UploadResponse = await res.json()
      return json.data.url
    },
  })
}
