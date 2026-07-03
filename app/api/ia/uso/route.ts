import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// GET /api/ia/uso → { habilitada, usadoHoy, maxPorUsuarioPorDia, restante }
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const res = await fetch(`${BACKEND_URL}/ia/uso`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 200)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
