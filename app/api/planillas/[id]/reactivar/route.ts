import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/planillas/[id]/reactivar → restaura una planilla soft-deleted. SuperAdmin.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/reactivar`, { method: "PATCH" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
