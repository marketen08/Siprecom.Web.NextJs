import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/elementos?sistemaId=...&subSistemaId=...
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const sistemaId = sp.get("sistemaId")
  const subSistemaId = sp.get("subSistemaId")

  const qs = new URLSearchParams()
  if (sistemaId) qs.set("sistemaId", sistemaId)
  if (subSistemaId) qs.set("subSistemaId", subSistemaId)
  const path = qs.toString()
    ? `/avance/elementos?${qs.toString()}`
    : "/avance/elementos"

  const res = await backendFetch(request, path)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
