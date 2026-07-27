import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams.toString()
  const res = await backendFetch(request, `/pendientes-catalogo/resolver${qs ? `?${qs}` : ""}`)
  // 404 esperado cuando no hay match → devolvemos igual el body para que el
  // frontend distinga entre "no match" y error real.
  const data = await res.json().catch(() => null)
  return Response.json(data, { status: res.status })
}
