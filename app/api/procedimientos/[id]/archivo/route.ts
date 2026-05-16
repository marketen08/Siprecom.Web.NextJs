import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/procedimientos/[id]/archivo  (multipart con campo "archivo")
// Reenvía el FormData al backend tal cual. backend-fetch detecta FormData y no
// sobreescribe el Content-Type (deja que fetch ponga el boundary correcto).
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/procedimientos/[id]/archivo">
) {
  const { id } = await context.params
  const formData = await request.formData()
  const res = await backendFetch(request, `/procedimientos/${id}/archivo`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
