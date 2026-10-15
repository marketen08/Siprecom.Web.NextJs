import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// POST /api/pendientes/[id]/completar/fisico  (multipart/form-data)
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/completar/fisico">,
) {
  const { id } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value

  if (!accessToken) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }

  // Reenviamos el FormData tal cual — no seteamos Content-Type porque fetch
  // lo arma solo con el boundary correcto.
  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/pendientes/${id}/completar/fisico`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
