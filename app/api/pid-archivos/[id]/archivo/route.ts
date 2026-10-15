import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/pid-archivos/[id]/archivo  (multipart) — reemplaza el PDF conservando el mismo id.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]/archivo">
) {
  const { id } = await context.params
  const formData = await request.formData()
  const res = await backendFetch(request, `/pid-archivos/${id}/archivo`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error al reemplazar el PID" }))
  return Response.json(data, { status: res.status })
}
