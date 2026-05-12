import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/adjuntos">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pendientes/${id}/adjuntos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// Upload multipart: passthrough sin tocar el body.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/adjuntos">,
) {
  const { id } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }
  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/pendientes/${id}/adjuntos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
