import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/entidades/colores-por-estado
// Tipo de context laxo porque la ruta es nueva — los types generados por Next
// se actualizan después de que el dev server la registre.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/colores-por-estado`,
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
