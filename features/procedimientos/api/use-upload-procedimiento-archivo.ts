import { useMutation, useQueryClient } from "@tanstack/react-query"

interface UploadResponse {
  data: { id: string; archivoUrl: string | null; nombreArchivo: string | null } & Record<string, unknown>
  message?: string
}

export function useUploadProcedimientoArchivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }): Promise<UploadResponse> => {
      const fd = new FormData()
      fd.append("archivo", file)
      const res = await fetch(`/api/procedimientos/${id}/archivo`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error al subir el archivo" }))
        throw new Error(err?.message ?? "Error al subir el archivo")
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      // Invalidamos el listado y el detalle del procedimiento para que se refresque el SAS URL.
      qc.invalidateQueries({ queryKey: ["procedimientos"] })
      qc.invalidateQueries({ queryKey: ["procedimiento", vars.id] })
    },
  })
}
