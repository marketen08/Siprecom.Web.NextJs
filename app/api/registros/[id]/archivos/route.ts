import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/archivos
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/archivos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/archivos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/registros/[id]/archivos — sube un archivo adjunto (multipart).
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/archivos">
) {
  const { id } = await context.params
  const fd = await request.formData()
  const res = await backendFetch(request, `/registros/${id}/archivos`, {
    method: "POST",
    body: fd,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
