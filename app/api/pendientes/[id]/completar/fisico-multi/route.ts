import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/completar/fisico-multi">,
) {
  const { id } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/pendientes/${id}/completar/fisico-multi`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
