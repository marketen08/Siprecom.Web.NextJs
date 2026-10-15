import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Input {
  nivelMcId: string | null
}

/**
 * PATCH /proyectos/{id}/nivel-mc — setea (o desconfigura pasando null) el
 * Nivel del catálogo que representa Mechanical Completion en el proyecto.
 * El certificado MC pasa a "aplica" cuando este campo está seteado.
 */
export function useUpdateProyectoNivelMc(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Input) =>
      apiClient.patch(`/api/proyectos/${id}/nivel-mc`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", id] })
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      qc.invalidateQueries({ queryKey: ["certificados"] })
    },
  })
}
