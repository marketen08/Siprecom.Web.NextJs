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
  /** Semántica según modo: en "pendientes" = roles que falta firmar; en "firmados" = roles ya firmados. */
  slotsParaFirmar: string[]
  /** Fecha de la firma más reciente del usuario en este registro. Solo en modo "firmados". */
  fechaFirma: string | null
}

export type MisFirmasModo = "pendientes" | "firmados"

interface Params {
  proyectoId: string | undefined
  page?: number
  pageSize?: number
  modo?: MisFirmasModo
}

export function useGetMisFirmas({ proyectoId, page = 1, pageSize = 20, modo = "pendientes" }: Params) {
  return useQuery({
    queryKey: ["mis-firmas", { proyectoId, page, pageSize, modo }],
    queryFn: () =>
      apiClient.get<{ data: MiFirmaPendiente[]; total: number; page: number; pageSize: number }>(
        "/api/registros/mis-firmas",
        { proyectoId: proyectoId ?? "", page, pageSize, modo }
      ),
    enabled: !!proyectoId,
  })
}
