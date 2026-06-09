import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  CrearProyectoDesdeIfcInput,
  CrearProyectoDesdeIfcOutput,
} from "../types"

/**
 * Crea un Proyecto nuevo subiendo un archivo NWD (Plant 3D / Navisworks). El
 * archivo se sube a APS OSS, se dispara Model Derivative para SVF2, y un
 * background worker hace el bootstrap (Sistemas/SubSistemas/Elementos).
 *
 * Misma interfaz que `useCrearProyectoDesdeIfc` — sólo cambia el endpoint y
 * el pipeline interno.
 */
export function useCrearProyectoDesdeNwd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearProyectoDesdeIfcInput): Promise<CrearProyectoDesdeIfcOutput> => {
      const fd = new FormData()
      fd.append("nombre", input.nombre)
      fd.append("clienteId", input.clienteId)
      if (input.contratistaId) fd.append("contratistaId", input.contratistaId)
      if (input.nombreArchivo) fd.append("nombreArchivo", input.nombreArchivo)
      if (input.disciplina) fd.append("disciplina", input.disciplina)
      if (input.apsTagProperties) fd.append("apsTagProperties", input.apsTagProperties)
      fd.append("archivo", input.archivo)

      const res = await fetch(`/api/aps/crear-proyecto-desde-nwd`, {
        method: "POST",
        body: fd,
      })
      const body = await res.json().catch(() => ({ message: "Error creando proyecto desde NWD" }))
      if (!res.ok) throw new Error(formatError(body))
      const data = (body as ApiResponse<CrearProyectoDesdeIfcOutput>)?.data
      if (!data?.proyectoId) throw new Error("Respuesta inválida del servidor.")
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}

function formatError(body: any): string {
  if (Array.isArray(body?.errors)) {
    const lineas = body.errors.flatMap((e: any) =>
      Array.isArray(e?.errors)
        ? e.errors.map((m: string) => (e.field ? `${e.field}: ${m}` : m))
        : [],
    )
    if (lineas.length > 0) return lineas.join("\n")
  }
  return body?.message ?? "Error creando proyecto desde NWD"
}
