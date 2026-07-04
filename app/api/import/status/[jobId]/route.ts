import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// GET /api/import/status/{jobId} — polling del estado del job en curso.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/import/status/[jobId]">,
) {
  const { jobId } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }

  const res = await fetch(`${BACKEND_URL}/import/status/${jobId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    // Cache off — es un polling. Sin esto el status queda pegado en el primer valor.
    cache: "no-store",
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
