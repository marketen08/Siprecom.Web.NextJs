import { useMutation, useQueryClient } from "@tanstack/react-query"

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
      queryClient.invalidateQueries({ queryKey: ["registros", registroId] })
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
      // Tras completar, el registro pasa a estado COMPLETADO y aparecen slots
      // de firma pendientes — refrescar la pantalla "Mis firmas".
      queryClient.invalidateQueries({ queryKey: ["mis-firmas"] })
    },
  })
}
