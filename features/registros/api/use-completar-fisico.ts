import { useMutation, useQueryClient } from "@tanstack/react-query"
import { invalidarPostCargaRegistro } from "./invalidar-post-carga"

export function useCompletarFisico(registroId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`/api/registros/${registroId}/completar/fisico`, {
        method: "POST",
        body: formData,
        // No Content-Type — browser sets multipart boundary automatically
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? "Error al subir el archivo")
      }
      return res.json()
    },
    onSuccess: () => {
      invalidarPostCargaRegistro(queryClient, registroId)
    },
  })
}
