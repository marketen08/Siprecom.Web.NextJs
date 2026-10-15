import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"

interface Vars {
  elementoTareaId: string
  observacion?: string | null
}

/**
 * Marca una tarea como completada sin registro (planilla física ni digital).
 * Solo funciona si el proyecto tiene `PermitirAvanceSinRegistro=true`. Crea un
 * Registro marcador con `SinPlanilla=true` y aplica el flujo normal de firmas
 * (auto-firma slots que matcheen al user actual si tiene firma guardada).
 *
 * Errores del backend:
 * - 409 Conflict: proyecto no permite avance sin registro, tarea no está en
 *   PENDIENTE, o gate de predecesores no cumplido.
 * - 401/403: sin permiso.
 */
export function useMarcarCompletadaSinRegistro() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ elementoTareaId, observacion }: Vars) =>
      apiClient.post(
        `/api/elementos-tareas/${elementoTareaId}/marcar-completada-sin-registro`,
        { observacion: observacion ?? null },
      ),
    onSuccess: () => {
      // Cero registroId disponible en la respuesta acá (el hook no la parsea);
      // invalidamos amplio y listo — el sheet se re-render con el estado nuevo.
      invalidarPostCargaRegistro(queryClient, null)
    },
  })
}
