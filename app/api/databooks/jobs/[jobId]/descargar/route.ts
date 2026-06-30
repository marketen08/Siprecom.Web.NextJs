import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/databooks/jobs/{jobId}/descargar — devuelve la SAS URL del blob.
// El frontend usa la SAS para descargar directo de Azure (sin pasar por acá).
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params
  const res = await backendFetch(request, `/databooks/jobs/${jobId}/descargar`)
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
