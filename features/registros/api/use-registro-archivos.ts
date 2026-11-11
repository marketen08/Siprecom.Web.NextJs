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

/**
 * Da de baja un adjunto. Es soft-delete del lado del backend —la fila queda inactiva y
 * el archivo sigue en el storage—, así que una baja por error se puede revertir.
 *
 * Sobre un registro ya FIRMADO o APROBADO el backend pide rol Admin y `motivo`: el
 * adjunto es parte de la documentación que respalda algo que alguien firmó.
 */
export function useDeleteRegistroArchivo(registroId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ archivoId, motivo }: { archivoId: string; motivo?: string }) => {
      // El motivo va por query string: un DELETE con body no lo mandan todos los
      // clientes igual, y el proxy de Next tendría que reenviarlo a mano.
      const qs = motivo ? `?motivo=${encodeURIComponent(motivo)}` : ""
      return apiClient.delete(`/api/registros/${registroId}/archivos/${archivoId}${qs}`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registros", registroId, "archivos"] })
    },
  })
}
