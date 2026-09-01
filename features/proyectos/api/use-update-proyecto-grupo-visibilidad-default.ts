import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface Input {
  grupoVisibilidadPorDefectoId: string | null
}

/**
 * PATCH /proyectos/{id}/grupo-visibilidad-default — setea (o desconfigura
 * pasando null) el grupo aplicado por defecto al activar el toggle
 * "Pendiente interno" en el form de pendiente.
 *
 * Sin default configurado, el toggle sigue funcionando pero el UI abre
 * "Opciones avanzadas" pidiendo al usuario que elija un grupo manualmente.
 */
export function useUpdateProyectoGrupoVisibilidadDefault(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Input) =>
      apiClient.patch(`/api/proyectos/${id}/grupo-visibilidad-default`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos", id] })
      qc.invalidateQueries({ queryKey: ["proyectos"] })
      // El default afecta el UI de creación de pendientes — invalidar la
      // query del proyecto para que el form del pendiente lo refleje.
      qc.invalidateQueries({ queryKey: ["mis-proyectos"] })
    },
  })
}
