import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/proyectos/[id]/usuarios-roles/[asignacionId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; asignacionId: string }> }
) {
  const { id, asignacionId } = await context.params
  const res = await backendFetch(
    request,
    `/proyectos/${id}/usuarios-roles/${asignacionId}`,
    { method: "DELETE" }
  )
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
