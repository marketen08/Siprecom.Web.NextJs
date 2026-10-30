import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

const PARAMS = ["subSistemaId", "nivelId", "especialidadId", "incluirIndice"] as const

// GET /api/databooks/caratulas — PDF de solo carátulas, para imprimir separadores.
// A diferencia del databook, no encola nada: el backend devuelve el PDF en la
// misma request, así que lo único que hacemos es pasar el stream tal cual.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const qs = new URLSearchParams()
  for (const key of PARAMS) {
    const v = sp.get(key)
    if (v) qs.set(key, v)
  }
  const path = qs.toString()
    ? `/databooks/caratulas?${qs.toString()}`
    : "/databooks/caratulas"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="caratulas.pdf"`,
    },
  })
}
