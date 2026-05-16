import { useMutation, useQueryClient } from "@tanstack/react-query"

interface CreateInput {
  nombre: string
  observaciones?: string
  archivo?: File | null
}

interface ProcedimientoResponse {
  data: { id: string } & Record<string, unknown>
  message?: string
}

/**
 * POST /api/procedimientos (multipart). El backend acepta texto + PDF opcional en el mismo
 * request. Si falla la validación del archivo, no se crea el procedimiento (atomic).
 */
export function useCreateProcedimiento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInput): Promise<ProcedimientoResponse> => {
      const fd = new FormData()
      fd.append("Nombre", data.nombre)
      if (data.observaciones) fd.append("Observaciones", data.observaciones)
      if (data.archivo) fd.append("Archivo", data.archivo)
      const res = await fetch("/api/procedimientos", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al crear el procedimiento" }))
        throw new Error(formatError(err))
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] })
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
  return body?.message ?? "Error al crear el procedimiento"
}
