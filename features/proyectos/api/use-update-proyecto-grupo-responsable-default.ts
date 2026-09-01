import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Input {
  grupoResponsablePorDefectoId: string | null
}

/**
 * PATCH /proyectos/{id}/grupo-responsable-default — setea (o desconfigura
 * pasando null) el grupo aplicado por defecto al activar el toggle "Asignar
 * al grupo responsable por defecto" en el form de pendiente.
 *
 * Sin default configurado, el toggle sigue funcionando pero el UI abre
 * "Opciones avanzadas" pidiendo al usuario que elija un grupo manualmente.
 */
export function useUpdateProyectoGrupoResponsableDefault(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Input) =>
      apiClient.patch(`/api/proyectos/${id}/grupo-responsable-default`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", id] })
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      qc.invalidateQueries({ queryKey: ["mis-proyectos"] })
    },
  })
}
