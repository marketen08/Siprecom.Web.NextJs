import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/verificacion">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/verificacion`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
