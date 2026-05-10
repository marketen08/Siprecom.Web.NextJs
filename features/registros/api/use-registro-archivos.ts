import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface RegistroArchivo {
  id: string
  registroId: string
  nombreArchivo: string
  contentType: string
  tamanioBytes: number
  posicion: number
  revision: number
  url: string
  urlExpiraEn: string
}

interface ArchivosResponse {
  data: RegistroArchivo[]
}

interface ArchivoResponse {
  data: RegistroArchivo
}

export function useGetRegistroArchivos(registroId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["registros", registroId, "archivos"],
    queryFn: () => apiClient.get<ArchivosResponse>(`/api/registros/${registroId}/archivos`),
    enabled: !!registroId && enabled,
    // SAS expira a los 60min: refrescamos antes de eso para no servir links muertos.
    staleTime: 1000 * 60 * 50,
  })
}

export function useUploadRegistroArchivo(registroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File): Promise<RegistroArchivo> => {
      const fd = new FormData()
      fd.append("archivo", file)
      const res = await fetch(`/api/registros/${registroId}/archivos`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al subir el archivo" }))
        throw new Error(err?.message ?? "Error al subir el archivo")
      }
      const json: ArchivoResponse = await res.json()
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registros", registroId, "archivos"] })
    },
  })
}

export function useDeleteRegistroArchivo(registroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (archivoId: string) =>
      apiClient.delete(`/api/registros/${registroId}/archivos/${archivoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registros", registroId, "archivos"] })
    },
  })
}
