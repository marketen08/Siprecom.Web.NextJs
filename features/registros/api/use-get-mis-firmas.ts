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
  /**
   * Especialidad del registro. Sale del ElementoTipo del elemento — el de la tarea,
   * o el sintético del pack cuando el registro es encabezado. Nunca viene null desde
   * el backend (las dos columnas de la cadena son NOT NULL).
   */
  especialidadId: string | null
  especialidadNombre: string | null
  especialidadCodigo: string | null
  especialidadColor: string | null
}

export type MisFirmasModo = "pendientes" | "firmados"

interface Params {
  proyectoId: string | undefined
  page?: number
  pageSize?: number
  modo?: MisFirmasModo
  /** Acota la cola a una disciplina. Vacío = todas. */
  especialidadId?: string
}

export function useGetMisFirmas({
  proyectoId,
  page = 1,
  pageSize = 20,
  modo = "pendientes",
  especialidadId,
}: Params) {
  return useQuery({
    queryKey: ["mis-firmas", { proyectoId, page, pageSize, modo, especialidadId }],
    queryFn: () =>
      apiClient.get<{ data: MiFirmaPendiente[]; total: number; page: number; pageSize: number }>(
        "/api/registros/mis-firmas",
        {
          proyectoId: proyectoId ?? "",
          page,
          pageSize,
          modo,
          // Sin especialidad no se manda el parámetro en vez de mandarlo vacío: el
          // backend ya trata el string vacío como "no filtrar", pero así la URL del
          // request queda legible en el network tab.
          ...(especialidadId ? { especialidadId } : {}),
        }
      ),
    enabled: !!proyectoId,
  })
}
