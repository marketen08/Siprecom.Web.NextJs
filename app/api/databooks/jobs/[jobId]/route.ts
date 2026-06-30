import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const res = await backendFetch(request, `/databooks/jobs/${jobId}`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const res = await backendFetch(request, `/databooks/jobs/${jobId}`, {
    method: "DELETE",
  })
  if (res.status === 204) return new Response(null, { status: 204 })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
