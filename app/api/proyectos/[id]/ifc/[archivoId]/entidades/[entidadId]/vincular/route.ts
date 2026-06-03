import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/proyectos/[id]/ifc/[archivoId]/entidades/[entidadId]/vincular
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/entidades/[entidadId]/vincular">,
) {
  const { id, archivoId, entidadId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
    { method: "PUT", body },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/proyectos/[id]/ifc/[archivoId]/entidades/[entidadId]/vincular
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/entidades/[entidadId]/vincular">,
) {
  const { id, archivoId, entidadId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/${entidadId}/vincular`,
    { method: "DELETE" },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
