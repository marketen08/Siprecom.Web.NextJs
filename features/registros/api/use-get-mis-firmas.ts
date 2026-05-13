import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface MiFirmaPendiente {
  registroId: string
  elementoNombre: string
  elementoTag: string
  tareaNombre: string
  proyectoNombre: string
  subsistemaNombre: string
  estado: string
  fechaTerminado: string | null
  esFisico: boolean
  slotsParaFirmar: string[]
}

interface Params {
  proyectoId: string | undefined
  page?: number
  pageSize?: number
  estado?: string | null
}

export function useGetMisFirmas({ proyectoId, page = 1, pageSize = 20, estado }: Params) {
  return useQuery({
    queryKey: ["mis-firmas", { proyectoId, page, pageSize, estado }],
    queryFn: () =>
      apiClient.get<{ data: MiFirmaPendiente[]; total: number; page: number; pageSize: number }>(
        "/api/registros/mis-firmas",
        { proyectoId: proyectoId ?? "", page, pageSize, ...(estado ? { estado } : {}) }
      ),
    enabled: !!proyectoId,
  })
}
