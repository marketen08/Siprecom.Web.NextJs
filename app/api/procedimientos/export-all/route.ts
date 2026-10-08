import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/procedimientos/export-all → descarga JSON con los procedimientos. Solo SuperAdmin.
//
// equipoOrigen acota el export al catálogo de un equipo ("__none__" = los globales). Sin él,
// exporta todos, que es el comportamiento de siempre.
export async function GET(request: NextRequest) {
  const equipoOrigen = request.nextUrl.searchParams.get("equipoOrigen")
  const path = equipoOrigen
    ? `/procedimientos/export-all?equipoOrigen=${encodeURIComponent(equipoOrigen)}`
    : "/procedimientos/export-all"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="procedimientos.json"`,
    },
  })
}
