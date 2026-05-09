import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

const KEY = ["usuarios", "me", "firma"] as const

interface FirmaResponse {
  data: { url: string | null }
}

/** Devuelve la SAS URL de la firma guardada del usuario actual, o null. */
export function useGetMiFirma(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<FirmaResponse>("/api/usuarios/me/firma"),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/** Sube una nueva firma para el usuario actual desde un dataURL Base64 (PNG). */
export function useUploadMiFirma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dataUrl: string): Promise<string> => {
      const blob = dataUrlToBlob(dataUrl)
      const fd = new FormData()
      fd.append("archivo", blob, "firma.png")
      const res = await fetch("/api/usuarios/me/firma", { method: "POST", body: fd })
      if (!res.ok) throw new Error("No se pudo guardar la firma.")
      const json = await res.json()
      return json?.data?.url
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Borra la firma guardada del usuario actual. */
export function useDeleteMiFirma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete("/api/usuarios/me/firma"),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",")
  const mime = header.match(/data:(.*);base64/)?.[1] ?? "image/png"
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}
