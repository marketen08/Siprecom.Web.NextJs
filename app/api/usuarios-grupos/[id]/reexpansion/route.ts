import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/usuarios-grupos/[id]/reexpansion">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/usuarios-grupos/${id}/reexpansion`, { method: "POST" })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
