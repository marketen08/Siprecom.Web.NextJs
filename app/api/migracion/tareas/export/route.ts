import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/migracion/tareas/export?proyectoId=... → descarga JSON de tareas del proyecto.
export async function GET(request: NextRequest) {
  const proyectoId = request.nextUrl.searchParams.get("proyectoId") ?? ""
  const res = await backendFetch(request, `/migracion/tareas/export?proyectoId=${encodeURIComponent(proyectoId)}`)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="tareas.json"`,
    },
  })
}
