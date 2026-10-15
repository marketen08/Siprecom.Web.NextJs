import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Descarga binaria del .xlsx — proxeamos body y content-type sin tocar.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/pendientes-catalogo/import/plantilla")
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("content-type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("content-disposition") ??
        "attachment; filename=pendientes-catalogo-plantilla.xlsx",
    },
  })
}
