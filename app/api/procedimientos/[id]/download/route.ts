import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/procedimientos/[id]/download  → { data: { url, nombreArchivo, urlExpiraEn } }
// El backend valida que el usuario tenga acceso (Admin, o rol en algún proyecto que use este
// procedimiento). Si OK devuelve un SAS URL temporal del PDF en Azure Blob.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/procedimientos/[id]/download">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/procedimientos/${id}/download`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
