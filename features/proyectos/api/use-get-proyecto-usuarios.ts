import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface ProyectoUsuario {
  id: string
  usuarioId: string
  userName: string
  email: string
  nombre: string
  apellido: string
  esActivo: boolean
}

export function useGetProyectoUsuarios(proyectoId: string | null) {
  return useQuery({
    queryKey: ["proyecto-usuarios", proyectoId],
    queryFn: async () => {
      const data = await apiClient.get<ProyectoUsuario[]>(`/api/proyectos/${proyectoId}/usuarios`)
      // Orden natural para lista de personas: Apellido → Nombre → Email.
      // Sort in-place es OK — el array recién llega del network. `localeCompare`
      // con "es" da orden correcto para acentos y ñ.
      return data.slice().sort((a, b) => {
        const aApe = (a.apellido || a.nombre || a.email || "").toLowerCase()
        const bApe = (b.apellido || b.nombre || b.email || "").toLowerCase()
        const byApe = aApe.localeCompare(bApe, "es")
        if (byApe !== 0) return byApe
        const aNom = (a.nombre || a.email || "").toLowerCase()
        const bNom = (b.nombre || b.email || "").toLowerCase()
        const byNom = aNom.localeCompare(bNom, "es")
        if (byNom !== 0) return byNom
        return (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase(), "es")
      })
    },
    enabled: !!proyectoId,
  })
}
