import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/export-all → descarga JSON con las planillas. Solo SuperAdmin (backend).
//
// equipoOrigen acota el export al catálogo de un equipo ("__none__" = las globales). Sin él,
// exporta todas, que es el comportamiento de siempre.
export async function GET(request: NextRequest) {
  const equipoOrigen = request.nextUrl.searchParams.get("equipoOrigen")
  const path = equipoOrigen
    ? `/planillas/export-all?equipoOrigen=${encodeURIComponent(equipoOrigen)}`
    : "/planillas/export-all"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="planillas-todas.json"`,
    },
  })
}
