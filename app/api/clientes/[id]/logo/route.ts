import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/clientes/[id]/logo  (multipart/form-data)
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/clientes/[id]/logo">
) {
  const { id } = await context.params
  const fd = await request.formData()
  const res = await backendFetch(request, `/clientes/${id}/logo`, {
    method: "POST",
    body: fd,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
