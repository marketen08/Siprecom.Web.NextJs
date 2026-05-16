import { useMutation, useQueryClient } from "@tanstack/react-query"

interface UpdateInput {
  nombre: string
  observaciones?: string
  /** PDF nuevo. Si es null, se conserva el archivo actual. */
  archivo?: File | null
}

interface ProcedimientoResponse {
  data: { id: string } & Record<string, unknown>
  message?: string
}

/**
 * PUT /api/procedimientos/{id} (multipart). Acepta texto + PDF opcional. Si no se envía
 * archivo, el backend conserva el actual.
 */
export function useUpdateProcedimiento(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateInput): Promise<ProcedimientoResponse> => {
      const fd = new FormData()
      fd.append("Nombre", data.nombre)
      if (data.observaciones) fd.append("Observaciones", data.observaciones)
      if (data.archivo) fd.append("Archivo", data.archivo)
      const res = await fetch(`/api/procedimientos/${id}`, { method: "PUT", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al actualizar el procedimiento" }))
        throw new Error(formatError(err))
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] })
      queryClient.invalidateQueries({ queryKey: ["procedimiento", id] })
    },
  })
}

function formatError(body: any): string {
  if (Array.isArray(body?.errors)) {
    const lineas = body.errors.flatMap((e: any) =>
      Array.isArray(e?.errors)
        ? e.errors.map((m: string) => (e.field ? `${e.field}: ${m}` : m))
        : []
    )
    if (lineas.length > 0) return lineas.join("\n")
  }
  return body?.message ?? "Error al actualizar el procedimiento"
}
