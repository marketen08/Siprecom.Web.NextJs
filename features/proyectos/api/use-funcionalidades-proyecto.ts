import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface FuncionalidadProyecto {
  clave: string
  nombre: string
  descripcion: string
  permiteOverrideProyecto: boolean
  /** Master switch global (SuperAdmin). */
  habilitadaGlobal: boolean
  /** Override propio del proyecto. */
  habilitadaProyecto: boolean
  /** Estado efectivo = global AND proyecto. */
  efectiva: boolean
}

export function useGetFuncionalidadesProyecto(id: string) {
  return useQuery({
    queryKey: ["proyectos", id, "funcionalidades"],
    queryFn: () => apiClient.get<FuncionalidadProyecto[]>(`/api/proyectos/${id}/funcionalidades`),
  })
}

export function useSetFuncionalidadProyecto(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { clave: string; habilitada: boolean }) =>
      apiClient.patch<FuncionalidadProyecto>(`/api/proyectos/${id}/funcionalidades`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", id, "funcionalidades"] })
      // El estado efectivo viaja también en el detalle del proyecto y en mis-proyectos.
      qc.invalidateQueries({ queryKey: ["proyectos", id] })
      qc.invalidateQueries({ queryKey: ["mis-proyectos"] })
    },
  })
}
