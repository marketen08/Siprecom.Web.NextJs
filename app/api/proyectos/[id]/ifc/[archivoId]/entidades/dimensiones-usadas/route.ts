import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/entidades/dimensiones-usadas
// Devuelve { sistemaIds, subSistemaIds } — los que tienen al menos una entidad
// vinculada en el archivo. El panel de filtros del visor acota sus combos con esto.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/dimensiones-usadas`,
    { method: "GET" },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
