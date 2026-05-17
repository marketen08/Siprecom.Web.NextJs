import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/usuarios/[id]/permanent — baja definitiva con liberación de email
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/permanent">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}/permanent`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({}))
  return Response.json(data, { status: res.status })
}
