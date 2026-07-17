import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { EstadoTestGroup } from "@/features/testgroups/types"

export interface ElementoTestGroupItem {
  testGroupId: string
  codigo: string
  nombre: string | null
  subSistemaId: string
  subSistemaCodigo: string | null
  subSistemaNombre: string | null
  elementoTipoSinteticoNombre: string | null
  estado: EstadoTestGroup
  estadoTexto: string
}

/**
 * Lista de TestGroups activos que abarcan a este elemento físico.
 * Se usa en el sheet detalle del elemento para el aviso "Este elemento
 * pertenece a los paquetes X, Y". Un elemento puede estar en N packs.
 */
export function useGetElementoTestGroups(id: string | null) {
  return useQuery({
    queryKey: ["elementos", id, "testgroups"],
    queryFn: () =>
      apiClient.get<ApiResponse<ElementoTestGroupItem[]>>(
        `/api/elementos/${id}/testgroups`,
      ),
    enabled: !!id,
  })
}
