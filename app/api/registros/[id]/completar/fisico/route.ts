import { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

// POST /api/registros/[id]/completar/fisico  (multipart/form-data)
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/completar/fisico">
) {
  const { id } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value

  if (!accessToken) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }

  // Forward FormData directly — don't set Content-Type (fetch sets it with boundary)
  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/registros/${id}/completar/fisico`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
