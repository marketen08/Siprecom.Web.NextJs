import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; folderId: string }> },
) {
  const { projectId, folderId } = await context.params
  const res = await backendFetch(
    request,
    `/aps/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`,
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
