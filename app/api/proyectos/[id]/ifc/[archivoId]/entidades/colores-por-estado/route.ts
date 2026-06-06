import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/colores-por-estado
// Body opcional con el filtro actual del visor — si tiene NivelIds, el cálculo
// de estado del Elemento respeta ese filtro (cuenta solo las tareas de esos
// niveles). Sin body o con body vacío → comportamiento global (todas las tareas).
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/colores-por-estado`,
    { method: "POST", body: body || "{}" },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
