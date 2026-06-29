import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/catalogos/plantilla → .xlsx con los catálogos actuales (todas las filas Accion=SKIP)
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/catalogos/plantilla")
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="catalogos-plantilla.xlsx"`,
    },
  })
}
