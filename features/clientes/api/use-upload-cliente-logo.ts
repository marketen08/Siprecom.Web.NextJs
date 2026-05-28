import { useMutation, useQueryClient } from "@tanstack/react-query"

interface UploadResult {
  urlLogo: string
  sasUrl: string
}

export function useUploadClienteLogo(clienteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File): Promise<UploadResult> => {
      const fd = new FormData()
      fd.append("archivo", archivo, archivo.name)
      const res = await fetch(`/api/clientes/${clienteId}/logo`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? "No se pudo subir el logo.")
      }
      const json = await res.json()
      return json?.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  })
}
