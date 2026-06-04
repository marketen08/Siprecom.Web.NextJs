import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; itemId: string }> },
) {
  const { projectId, itemId } = await context.params
  const res = await backendFetch(
    request,
    `/aps/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/versions`,
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
