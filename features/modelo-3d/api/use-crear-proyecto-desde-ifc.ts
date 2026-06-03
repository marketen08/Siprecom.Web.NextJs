import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  CrearProyectoDesdeIfcInput,
  CrearProyectoDesdeIfcOutput,
} from "../types"

/**
 * Crea un Proyecto nuevo subiendo un archivo IFC. El bootstrap (creación de
 * Sistemas, SubSistemas, Elementos) corre en background — el caller redirige
 * a /alcance/proyectos/{id}/modelo-3d donde el polling existente muestra el
 * progreso del archivo.
 *
 * Usa fetch directo (no apiClient) porque manda FormData.
 */
export function useCrearProyectoDesdeIfc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearProyectoDesdeIfcInput): Promise<CrearProyectoDesdeIfcOutput> => {
      const fd = new FormData()
      fd.append("nombre", input.nombre)
      fd.append("clienteId", input.clienteId)
      if (input.nombreArchivo) fd.append("nombreArchivo", input.nombreArchivo)
      if (input.disciplina) fd.append("disciplina", input.disciplina)
      fd.append("archivo", input.archivo)

      // Endpoint top-level (no bajo /api/proyectos/...) para evitar el conflicto
      // de ruteo con /api/proyectos/[id] — Next.js interpretaría "crear-desde-ifc"
      // como un id y devolvería 405.
      const res = await fetch(`/api/crear-proyecto-desde-ifc`, {
        method: "POST",
        body: fd,
      })
      const body = await res.json().catch(() => ({ message: "Error creando proyecto desde IFC" }))
      if (!res.ok) throw new Error(formatError(body))

      // El backend envuelve en ServiceResult → { message, data: { proyectoId, ... } }
      const data = (body as ApiResponse<CrearProyectoDesdeIfcOutput>)?.data
      if (!data?.proyectoId) throw new Error("Respuesta inválida del servidor.")
      return data
    },
    onSuccess: () => {
      // Refrescar la lista de proyectos para que aparezca el nuevo.
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
  return body?.message ?? "Error creando proyecto desde IFC"
}
