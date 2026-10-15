import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/certificados/[id]/revocar">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/certificados/${id}/revocar`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
