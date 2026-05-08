import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// Trae todos los campos para el selector de "Agregar campo existente" en la planilla.
// pageSize=1000 es el cap configurado en el backend (PagedRequest.PageSize > 1000 → 1000).
export function useGetCamposSelect() {
  return useQuery({
    queryKey: ["campos", "select"],
    queryFn: () => apiClient.get("/api/campos", { page: 1, pageSize: 1000 }),
  })
}
