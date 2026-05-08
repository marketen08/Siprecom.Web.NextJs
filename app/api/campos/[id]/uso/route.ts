import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/campos/[id]/uso → planillas activas que usan este campo
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/uso">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/campos/${id}/uso`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
