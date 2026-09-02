import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/planillas-grupos/[id]/planillas/[planillaId] — quita la planilla del grupo.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; planillaId: string }> },
) {
  const { id, planillaId } = await context.params
  const res = await backendFetch(request, `/planillas-grupos/${id}/planillas/${planillaId}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
