import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PagedResponse } from "@/features/proyectos/types"

interface ClienteOption {
  id: string
  nombre: string
  esContratista: boolean
}

/**
 * Todas las empresas para poblar selects: clientes y contratistas por separado.
 *
 * Se llama SIN parámetros a propósito: `GET /clientes` sin `page`/`pageSize`
 * devuelve la lista completa. Agregar `pageSize` acá haría que el backend lo
 * trate como paginación explícita, que es justo lo que no queremos.
 */
export function useGetClientesSelect() {
  return useQuery({
    queryKey: ["clientes", "select"],
    queryFn: () =>
      apiClient.get<PagedResponse<ClienteOption>>("/api/clientes"),
    select: (res) => ({
      clientes: res.data.filter((c) => !c.esContratista),
      contratistas: res.data.filter((c) => c.esContratista),
    }),
    staleTime: 1000 * 60 * 10, // 10 min — los clientes no cambian seguido
  })
}
