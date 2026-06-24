import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

/** Toggle del valor por defecto de una opción (marca/desmarca, exclusivo por campo). */
export function useToggleOpcionDefault() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { campoId: string; opcionId: string }) =>
      apiClient.put(`/api/campos/${vars.campoId}/opciones/${vars.opcionId}/default`, {}),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["campos", vars.campoId, "opciones"] })
      qc.invalidateQueries({ queryKey: ["planillas"] })
    },
  })
}
