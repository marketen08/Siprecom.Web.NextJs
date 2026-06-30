import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/mantenimiento/avance-demo/jobs/{jobId} — polling.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const res = await backendFetch(request, `/mantenimiento/avance-demo/jobs/${jobId}`)
  const data = await res.json().catch(() => ({ error: "Error" }))
  return Response.json(data, { status: res.status })
}
