import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/mantenimiento/avance-demo/inspeccion?proyectoId=X
export async function GET(request: NextRequest) {
  const proyectoId = request.nextUrl.searchParams.get("proyectoId") ?? ""
  const qs = proyectoId ? `?proyectoId=${encodeURIComponent(proyectoId)}` : ""
  const res = await backendFetch(request, `/mantenimiento/avance-demo/inspeccion${qs}`)
  const data = await res.json().catch(() => ({ error: "Error" }))
  return Response.json(data, { status: res.status })
}
