import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const PARAMS = ["nivelId", "sistemaId", "subSistemaId", "especialidadId"] as const

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/reportes/avance-proyecto/pdf?${qs.toString()}`
    : "/reportes/avance-proyecto/pdf"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="avance-proyecto.pdf"`,
    },
  })
}
