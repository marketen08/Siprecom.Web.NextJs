import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const PARAMS = [
  "sistemaId",
  "subSistemaId",
  "especialidadId",
  "elementoTipoId",
  "prioridad",
  "tareaId",
  "estadoTarea",
  "search",
  "page",
  "pageSize",
] as const

// GET /api/avance/elementos?{filtros}
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/avance/elementos?${qs.toString()}`
    : "/avance/elementos"

  const res = await backendFetch(request, path)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
