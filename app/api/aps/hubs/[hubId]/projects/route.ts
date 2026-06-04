import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ hubId: string }> },
) {
  const { hubId } = await context.params
  const res = await backendFetch(request, `/aps/hubs/${encodeURIComponent(hubId)}/projects`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
