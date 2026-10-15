import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planificacion/fechas/plantilla → Excel precargado con TAG + Tarea + FechaPlanificada.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/planificacion/fechas/plantilla")
  const buf = await res.arrayBuffer()
  return new Response(buf, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type")
        ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": res.headers.get("content-disposition") ?? "attachment; filename=planificacion-fechas.xlsx",
    },
  })
}
